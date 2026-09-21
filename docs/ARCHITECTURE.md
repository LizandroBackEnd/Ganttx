# Ganttx — Architecture Document

> Collaborative real-time project management through interactive Gantt charts and calendar views.

---

## 1. Vision and Problem Statement

### What Ganttx Solves

Local-first tools like Obsidian with Gantt Calendar plugins hit a ceiling when teams need to collaborate:

- **No concurrent editing.** Two people editing the same vault file causes merge conflicts and data loss.
- **No real-time sync.** Changes require manual sync cycles (git pull, Obsidian Sync polling) — stale views are the norm.
- **No role-based access.** Everyone with vault access has full write permissions; there is no concept of project ownership, admin, or read-only member.
- **No structured task model.** Tasks live as YAML frontmatter inside markdown files — no relational integrity, no foreign keys, no validation beyond what a plugin can parse at runtime.

Ganttx is a **web-native, multi-tenant, real-time collaborative** application that replaces local Gantt plugins with a purpose-built platform. Every mutation is validated server-side, persisted to PostgreSQL, and broadcast to all connected project members within milliseconds.

### Core Capabilities

| Capability              | Description                                                                 |
| ----------------------- | --------------------------------------------------------------------------- |
| Multi-view scheduling   | Day, Week, Month, Year, Tasks (table), and Gantt (horizontal bar) views     |
| Real-time collaboration | Live cursor-free sync — task mutations broadcast instantly via SSE           |
| Role-based access       | Owner, Admin, Member roles per project with granular permission enforcement  |
| Optimistic mutations    | UI updates instantly on user action; rolls back if the server rejects       |
| Google-only auth        | Zero-friction onboarding via Google OAuth through Auth.js                   |
| Invite by email         | Project owners invite collaborators by Google email address                 |

---

## 2. Technology Stack

| Layer            | Technology                          | Version        | Rationale                                                      |
| ---------------- | ----------------------------------- | -------------- | -------------------------------------------------------------- |
| Framework        | Next.js (App Router)                | `16.3.5`       | RSC-first, Server Actions, streaming, edge middleware           |
| Runtime          | React / React DOM                   | `19.2.8`       | `useOptimistic`, `useActionState`, `use()` for real-time state  |
| Language         | TypeScript                          | `^5`           | `strict: true`, path alias `@/*` → `./src/*`                   |
| Styling          | Tailwind CSS                        | `^4`           | CSS-first config via `@tailwindcss/postcss`, no JS config file  |
| Component lib    | shadcn/ui                           | latest         | Accessible, composable primitives built on Radix UI             |
| ORM              | Prisma Client / Prisma CLI          | `^7` / `^8-rc` | Type-safe queries, migration workflow, PostgreSQL native types   |
| Database         | PostgreSQL                          | `17.5-alpine`  | JSONB, triggers, row-level security capability, mature ecosystem |
| Authentication   | Auth.js (NextAuth v5)               | `^5`           | Google OAuth provider, Prisma adapter for session persistence   |
| Real-time        | Server-Sent Events (SSE)            | native         | Unidirectional server→client push, no WebSocket infra needed    |
| Validation       | Zod                                 | `^3`           | Runtime schema validation for Server Actions and API inputs     |
| Package manager  | Bun                                 | `1.3.0`        | Fast installs, native TS execution, script runner               |
| Containerization | Docker / Docker Compose             | latest         | Local PostgreSQL, reproducible dev environment                  |

### Why SSE over WebSockets

For Ganttx, data flow is predominantly **server → client** (task updates, member joins, status changes). SSE provides:

1. **Simpler infrastructure.** No WebSocket upgrade negotiation, no sticky sessions, no socket.io dependency.
2. **Auto-reconnection.** The `EventSource` API reconnects automatically with `Last-Event-ID` resumption.
3. **HTTP/2 multiplexing.** Multiple SSE streams share a single TCP connection.
4. **Server Action mutations.** Client → server writes go through standard Server Actions (HTTP POST), not through the event channel.

The only case where WebSockets would be justified is cursor presence (collaborative editing like Figma). Ganttx does not require cursor presence — it synchronizes discrete task mutations.

---

## 3. System Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Client)                          │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────┐    │
│  │  RSC Payload  │    │ Client Comps │    │  EventSource (SSE) │    │
│  │  (HTML stream)│    │ useOptimistic│    │  auto-reconnect    │    │
│  └──────┬───────┘    └──────┬───────┘    └────────┬───────────┘    │
│         │                   │ Server Action         │               │
│         │                   │ (HTTP POST)           │               │
└─────────┼───────────────────┼───────────────────────┼───────────────┘
          │                   │                       │
          ▼                   ▼                       │
┌─────────────────────────────────────────────────────┼───────────────┐
│                    NEXT.JS SERVER                   │               │
│                                                     │               │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┴──────────┐   │
│  │ App Router │  │Server Actions│  │ SSE Route Handler        │   │
│  │ RSC render │  │ Zod validate │  │ GET /api/projects/[id]/  │   │
│  │ page.tsx   │  │ Prisma write │  │     events               │   │
│  └─────┬──────┘  └──────┬───────┘  │ Reads from EventEmitter  │   │
│        │                │          └───────────────────────────┘   │
│        │                │                                          │
│        ▼                ▼                                          │
│  ┌──────────────────────────────────┐                              │
│  │       Prisma Client Singleton    │                              │
│  │       (src/lib/prisma.ts)        │                              │
│  └──────────────┬───────────────────┘                              │
│                 │                                                   │
└─────────────────┼───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│         PostgreSQL 17.5-alpine      │
│         (Docker Compose)            │
│                                     │
│  Tables: users, projects,           │
│  project_members, tasks,            │
│  accounts, sessions,                │
│  verification_tokens                │
└─────────────────────────────────────┘
```

### Mutation + Broadcast Flow

```
User drags Gantt bar to new date
        │
        ▼
┌─────────────────────────────┐
│ 1. useOptimistic() updates  │  ← Instant UI feedback
│    local task state          │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 2. Server Action fires      │
│    updateTaskDates()         │
│    - Zod validates input    │
│    - Auth session checked   │
│    - Prisma updates row     │
│    - revalidateTag('tasks') │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 3. Server emits event to    │
│    project EventEmitter     │
│    { type: 'task:updated',  │
│      taskId, projectId,     │
│      changes, actorId }     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 4. SSE Route Handler pushes │
│    event to all connected   │
│    clients for that project │
│    (except the actor)       │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ 5. Client EventSource       │
│    receives event, merges   │
│    into React state via     │
│    useReducer/context       │
└─────────────────────────────┘
```

---

## 4. Directory Layout

Screaming Architecture: the folder structure tells you the business domain before you open a single file.

```
ganttx/
├── src/
│   ├── app/                              # Routing + composition only
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx              # Google OAuth sign-in page
│   │   │   └── layout.tsx                # Minimal auth layout (centered card)
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                # Sidebar + top nav shell
│   │   │   ├── page.tsx                  # Project list / home
│   │   │   └── projects/
│   │   │       └── [projectId]/
│   │   │           ├── layout.tsx        # Project-scoped layout with SSE provider
│   │   │           ├── page.tsx          # Default view (Month calendar)
│   │   │           ├── loading.tsx       # Skeleton for streaming
│   │   │           └── settings/
│   │   │               └── page.tsx      # Members, roles, project config
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts          # Auth.js catch-all route
│   │   │   └── projects/
│   │   │       └── [projectId]/
│   │   │           └── events/
│   │   │               └── route.ts      # SSE endpoint for real-time sync
│   │   ├── layout.tsx                    # Root layout: fonts, providers, metadata
│   │   └── globals.css                   # Tailwind v4 @import + @theme tokens
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── index.ts                  # Public barrel
│   │   │   ├── components/
│   │   │   │   └── google-sign-in-button.tsx
│   │   │   └── lib/
│   │   │       └── auth-options.ts       # Auth.js config (Google provider + Prisma adapter)
│   │   │
│   │   ├── projects/
│   │   │   ├── index.ts
│   │   │   ├── api/                      # Data access (server-only)
│   │   │   │   ├── get-projects.ts
│   │   │   │   ├── get-project-by-id.ts
│   │   │   │   └── project-mutations.ts  # Server Actions: create, update, delete
│   │   │   ├── components/
│   │   │   │   ├── project-card.tsx
│   │   │   │   ├── create-project-dialog.tsx
│   │   │   │   └── invite-member-form.tsx
│   │   │   └── types/
│   │   │       └── project.types.ts
│   │   │
│   │   ├── tasks/
│   │   │   ├── index.ts
│   │   │   ├── api/
│   │   │   │   ├── get-tasks.ts
│   │   │   │   └── task-mutations.ts     # Server Actions: create, update, move, delete
│   │   │   ├── components/
│   │   │   │   ├── task-form.tsx
│   │   │   │   ├── task-row.tsx
│   │   │   │   └── task-detail-panel.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-optimistic-tasks.ts
│   │   │   └── types/
│   │   │       └── task.types.ts
│   │   │
│   │   ├── calendar/
│   │   │   ├── index.ts
│   │   │   ├── components/
│   │   │   │   ├── calendar-grid.tsx      # Day/Week/Month/Year renderer
│   │   │   │   ├── view-switcher.tsx      # Segmented control tabs
│   │   │   │   ├── date-navigator.tsx     # Today + arrows + new task button
│   │   │   │   └── calendar-cell.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-calendar-state.ts
│   │   │   └── types/
│   │   │       └── calendar.types.ts
│   │   │
│   │   └── gantt/
│   │       ├── index.ts
│   │       ├── components/
│   │       │   ├── gantt-chart.tsx         # Horizontal bar chart renderer
│   │       │   ├── gantt-bar.tsx           # Draggable task bar
│   │       │   ├── gantt-header.tsx        # Time scale header
│   │       │   └── gantt-sidebar-toggle.tsx
│   │       ├── hooks/
│   │       │   └── use-gantt-drag.ts
│   │       └── types/
│   │           └── gantt.types.ts
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   └── ui/                        # shadcn/ui primitives
│   │   │       ├── button.tsx
│   │   │       ├── dialog.tsx
│   │   │       ├── input.tsx
│   │   │       ├── select.tsx
│   │   │       ├── tabs.tsx
│   │   │       ├── avatar.tsx
│   │   │       ├── badge.tsx
│   │   │       ├── skeleton.tsx
│   │   │       └── tooltip.tsx
│   │   └── hooks/
│   │       └── use-media-query.ts
│   │
│   ├── lib/
│   │   ├── prisma.ts                      # PrismaClient singleton
│   │   ├── cn.ts                          # clsx + tailwind-merge
│   │   ├── auth.ts                        # Auth.js instance export
│   │   ├── events.ts                      # In-process EventEmitter for SSE broadcast
│   │   └── constants.ts                   # App-wide constants (roles, statuses, priorities)
│   │
│   └── middleware.ts                      # Auth guard, redirect unauthenticated → /login
│
├── prisma/
│   ├── schema.prisma                      # Complete data model
│   └── migrations/                        # Timestamped SQL migrations
│
├── docs/
│   ├── ARCHITECTURE.md                    # This file
│   └── DATA-MODEL.md                      # Prisma schema design decisions
│
├── docker-compose.yml                     # PostgreSQL 17.5-alpine service
├── .env.local                             # DATABASE_URL, AUTH secrets (gitignored)
├── AGENTS.md                              # Agent operating manual
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── package.json
```

### Import Boundaries

```
shared/ ──► features/ ──► app/
               │
               ├── auth/
               ├── projects/
               ├── tasks/
               ├── calendar/
               └── gantt/
```

- `app/` imports from `features/` only through barrel `index.ts` files. Never reach into feature internals.
- `features/` import from `shared/` and `lib/`. Never import sideways between sibling features.
- If `calendar/` and `gantt/` both need a date utility, it lives in `shared/` or `lib/`.

---

## 5. Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────┐
│  Browser  │────►│  /login page │────►│ Google OAuth   │────►│ Callback │
│           │     │ "Sign in     │     │ Consent Screen │     │ Auth.js  │
│           │     │  with Google"│     │                │     │ handler  │
└──────────┘     └──────────────┘     └───────────────┘     └────┬─────┘
                                                                  │
                                                                  ▼
                                                         ┌───────────────┐
                                                         │ Prisma Adapter │
                                                         │ upsert User   │
                                                         │ create Account│
                                                         │ create Session│
                                                         └───────┬───────┘
                                                                 │
                                                                 ▼
                                                         ┌───────────────┐
                                                         │ Redirect to   │
                                                         │ /dashboard    │
                                                         └───────────────┘
```

### Auth.js Configuration

- **Provider:** Google OAuth only. No credentials, no magic links.
- **Adapter:** `@auth/prisma-adapter` — sessions and accounts persist in PostgreSQL.
- **Session strategy:** Database sessions (not JWT) for revocation capability.
- **Middleware:** `src/middleware.ts` protects all `(dashboard)` routes. Unauthenticated requests redirect to `/login`.

---

## 6. Real-Time Architecture (SSE)

### Server-Side Event Emitter

An in-process Node.js `EventEmitter` acts as the pub/sub bus. When a Server Action mutates a task, it emits an event keyed by `projectId`:

```
Server Action (task-mutations.ts)
    │
    ├── prisma.task.update(...)
    ├── revalidateTag(`tasks-${projectId}`)
    └── projectEmitter.emit(projectId, {
          type: 'task:updated',
          payload: { taskId, changes },
          actorId: session.user.id
        })
```

### SSE Route Handler

`GET /api/projects/[projectId]/events` — a streaming Route Handler that:

1. Validates the session (rejects unauthenticated requests with 401).
2. Verifies the user is a member of the project (rejects with 403).
3. Returns a `ReadableStream` with `Content-Type: text/event-stream`.
4. Attaches a listener to the `projectEmitter` for the given `projectId`.
5. Writes SSE-formatted data on each event.
6. Cleans up the listener when the client disconnects.

### Client-Side Consumer

```
EventSource(/api/projects/${projectId}/events)
    │
    ├── onmessage: 'task:created'   → append to local task list
    ├── onmessage: 'task:updated'   → merge changes into task map
    ├── onmessage: 'task:deleted'   → remove from local task list
    ├── onmessage: 'member:joined'  → update member list
    └── onerror: auto-reconnect with exponential backoff
```

### Scaling Considerations

The in-process `EventEmitter` works for a single-server deployment. For horizontal scaling (multiple Next.js instances behind a load balancer), replace with:

- **Redis Pub/Sub** — each server instance subscribes to project channels.
- **PostgreSQL LISTEN/NOTIFY** — leverages the existing database without additional infrastructure.

This is a future concern. The architecture isolates the emitter behind `src/lib/events.ts`, making the swap a single-file change.

---

## 7. User Interface Layout

### Inspired by Obsidian Gantt Calendar

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐  ┌───────┐ │
│  │  Day │ Week │ Month │ Year │ Tasks │ Gantt  ◄ segmented │  │  + ✚  │ │
│  └─────────────────────────────────────────────────────────┘  └───────┘ │
│  ┌────────────────────────┐                                             │
│  │  ◄  │  Today  │  ►     │  ← date navigation                         │
│  └────────────────────────┘                                             │
├─────────────────────────────────────────────────────┬────────────────────┤
│                                                     │  Gantt Panel       │
│                                                     │  (collapsible)     │
│           Calendar / Task Grid                      │                    │
│           (main content area)                       │  ┌──────────────┐  │
│                                                     │  │ ████████░░░  │  │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐      │  │ ██████░░░░░  │  │
│  │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │      │  │ ████████████ │  │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤      │  │ ██░░░░░░░░░  │  │
│  │     │ T1  │     │ T2  │     │     │     │      │  └──────────────┘  │
│  │     │ T3  │     │     │     │     │     │      │                    │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤      │  Toggle: [≡]      │
│  │     │     │ T4  │     │ T5  │     │     │      │                    │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘      │                    │
│                                                     │                    │
└─────────────────────────────────────────────────────┴────────────────────┘
```

### Component Decomposition

| Component              | Type       | Feature      | Responsibility                                    |
| ---------------------- | ---------- | ------------ | ------------------------------------------------- |
| `ViewSwitcher`         | Client     | `calendar`   | Segmented control: Day/Week/Month/Year/Tasks/Gantt |
| `DateNavigator`        | Client     | `calendar`   | Today button, previous/next arrows                 |
| `CalendarGrid`         | Server     | `calendar`   | Renders the grid for the active view mode          |
| `CalendarCell`         | Client     | `calendar`   | Click to create task, drag-drop zone               |
| `TaskForm`             | Client     | `tasks`      | Create/edit task dialog with Zod validation        |
| `TaskRow`              | Client     | `tasks`      | Single task in table view with inline editing       |
| `TaskDetailPanel`      | Client     | `tasks`      | Slide-over panel for full task details             |
| `GanttChart`           | Client     | `gantt`      | Horizontal bar chart with time scale               |
| `GanttBar`             | Client     | `gantt`      | Draggable/resizable bar representing a task        |
| `GanttSidebarToggle`   | Client     | `gantt`      | Toggle button to show/hide the Gantt panel         |

### View Modes

| View    | Grid Structure                | Task Rendering                              |
| ------- | ----------------------------- | ------------------------------------------- |
| Day     | 24-hour vertical timeline     | Tasks as time blocks                         |
| Week    | 7-column × 24-hour grid       | Tasks spanning their time range              |
| Month   | Standard calendar grid        | Task chips on start date, dots on due date   |
| Year    | 12-month overview             | Heat map density of tasks per day            |
| Tasks   | Table/list view               | Sortable, filterable rows with all fields    |
| Gantt   | Full-width horizontal chart   | Draggable bars on a time axis                |

---

### 7.1 Design System — Color Palette

Visual identity inspired by the Code Verse dark theme: deep blacks with subtle green tint, vibrant emerald accents, and high-contrast typography.

#### Core Palette

| Token                  | Hex         | HSL                    | Usage                                              |
| ---------------------- | ----------- | ---------------------- | -------------------------------------------------- |
| `--background`         | `#050d09`   | `150° 40% 3%`         | Page background, deepest surface                    |
| `--surface`            | `#0a1a10`   | `150° 40% 7%`         | Card backgrounds, sidebar, panels                   |
| `--surface-elevated`   | `#0f2618`   | `150° 40% 10%`        | Hover states, elevated cards, active nav items      |
| `--border`             | `#163b24`   | `150° 40% 16%`        | Card borders, dividers, input outlines              |
| `--border-subtle`      | `#0f2a18`   | `150° 40% 11%`        | Subtle separators, grid lines                       |

#### Green Accent (Primary)

| Token                  | Hex         | HSL                    | Usage                                              |
| ---------------------- | ----------- | ---------------------- | -------------------------------------------------- |
| `--primary`            | `#00d47e`   | `155° 100% 42%`       | CTA buttons, active tabs, primary actions           |
| `--primary-hover`      | `#00f28e`   | `155° 100% 47%`       | Button hover, link hover                            |
| `--primary-muted`      | `#0a4d30`   | `155° 75% 17%`        | Selected state backgrounds, subtle highlights       |
| `--primary-foreground` | `#ffffff`   | `0° 0% 100%`          | Text on primary-colored surfaces                    |

#### Text

| Token                  | Hex         | HSL                    | Usage                                              |
| ---------------------- | ----------- | ---------------------- | -------------------------------------------------- |
| `--text-primary`       | `#f0fdf4`   | `138° 76% 97%`        | Headings, high-emphasis text                        |
| `--text-secondary`     | `#9ca3af`   | `218° 11% 65%`        | Body text, descriptions, labels                     |
| `--text-muted`         | `#6b7280`   | `220° 9% 46%`         | Placeholder text, disabled labels                   |

#### Semantic / Status

| Token                  | Hex         | HSL                    | Usage                                              |
| ---------------------- | ----------- | ---------------------- | -------------------------------------------------- |
| `--success`            | `#22c55e`   | `142° 71% 45%`        | Done status, check marks, positive feedback         |
| `--warning`            | `#f59e0b`   | `38° 92% 50%`         | Medium priority, attention required                 |
| `--danger`             | `#ef4444`   | `0° 84% 60%`          | Urgent priority, destructive actions, errors        |
| `--info`               | `#06b6d4`   | `188° 94% 43%`        | Badges ("Most Popular"), informational highlights   |
| `--accent-orange`      | `#f97316`   | `25° 95% 53%`         | Enterprise tier, premium/highlighted elements       |

#### Task Priority Colors

| Priority | Color       | Token             |
| -------- | ----------- | ----------------- |
| Low      | `#22c55e`   | `--priority-low`  |
| Medium   | `#f59e0b`   | `--priority-med`  |
| High     | `#f97316`   | `--priority-high` |
| Urgent   | `#ef4444`   | `--priority-urg`  |

#### Task Status Colors

| Status      | Color       | Token               |
| ----------- | ----------- | -------------------- |
| To Do       | `#6b7280`   | `--status-todo`      |
| In Progress | `#06b6d4`   | `--status-progress`  |
| In Review   | `#f59e0b`   | `--status-review`    |
| Done        | `#22c55e`   | `--status-done`      |
| Cancelled   | `#ef4444`   | `--status-cancelled` |

#### Gantt Bar Colors

Gantt bars inherit the task priority color at 80% opacity for the filled portion and 20% opacity for the remaining/unfilled portion, creating a clear visual distinction between completed progress and remaining work.

#### Implementation in `globals.css`

```css
@theme {
  /* Surfaces */
  --color-background: #050d09;
  --color-surface: #0a1a10;
  --color-surface-elevated: #0f2618;
  --color-border: #163b24;
  --color-border-subtle: #0f2a18;

  /* Primary */
  --color-primary: #00d47e;
  --color-primary-hover: #00f28e;
  --color-primary-muted: #0a4d30;
  --color-primary-foreground: #ffffff;

  /* Text */
  --color-text-primary: #f0fdf4;
  --color-text-secondary: #9ca3af;
  --color-text-muted: #6b7280;

  /* Semantic */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #06b6d4;
  --color-accent-orange: #f97316;

  /* Priority */
  --color-priority-low: #22c55e;
  --color-priority-med: #f59e0b;
  --color-priority-high: #f97316;
  --color-priority-urg: #ef4444;

  /* Status */
  --color-status-todo: #6b7280;
  --color-status-progress: #06b6d4;
  --color-status-review: #f59e0b;
  --color-status-done: #22c55e;
  --color-status-cancelled: #ef4444;
}
```

---

## 8. Server Actions and Validation

Every mutation follows this pipeline:

```
FormData / JSON input
    │
    ▼
┌─────────────────┐
│ Zod Schema      │ ← Runtime type validation
│ .safeParse()    │
└────────┬────────┘
         │ fail → return { success: false, fieldErrors }
         │ pass ▼
┌─────────────────┐
│ Auth Check      │ ← session = await auth()
│ Role Check      │ ← verify membership + role for project
└────────┬────────┘
         │ fail → return { success: false, error: 'Unauthorized' }
         │ pass ▼
┌─────────────────┐
│ Prisma Mutation  │ ← Within $transaction if multi-step
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cache Invalidate │ ← revalidateTag / revalidatePath
│ Event Emit       │ ← projectEmitter.emit(projectId, event)
└────────┬────────┘
         │
         ▼
return { success: true, data }
```

### Key Server Actions

| Action                | Input                                     | Validation                               |
| --------------------- | ----------------------------------------- | ---------------------------------------- |
| `createProject`       | name, description                         | name: 3-100 chars, description optional  |
| `updateProject`       | projectId, name?, description?            | Ownership or Admin role                  |
| `inviteMember`        | projectId, email, role                    | Valid email, Owner/Admin can invite       |
| `removeMember`        | projectId, memberId                       | Owner can remove anyone, Admin ≠ Owner   |
| `createTask`          | projectId, title, startDate, dueDate, ... | Member of project, dates validated        |
| `updateTask`          | taskId, partial fields                    | Member of project, field-level validation |
| `updateTaskDates`     | taskId, startDate, dueDate                | Optimized for Gantt drag operations      |
| `updateTaskStatus`    | taskId, status                            | Valid status enum value                  |
| `deleteTask`          | taskId                                    | Creator, Assignee, or Admin+             |

---

## 9. Performance Strategy

### Server-Side

- **RSC by default.** Pages and layouts are Server Components. `'use client'` is pushed to interactive leaves (drag handlers, form inputs, toggles).
- **Parallel fetching.** Independent data needs (project, tasks, members) fetched with `Promise.all` in page components.
- **Streaming.** `loading.tsx` and `<Suspense>` boundaries for the calendar grid and Gantt chart so the shell renders instantly.
- **Select projections.** Every Prisma query uses explicit `select` — never `include` without field restrictions.
- **Cursor pagination.** Task lists paginate by cursor, not offset, for O(1) performance on large projects.

### Client-Side

- **Optimistic updates.** `useOptimistic` from React 19 for instant feedback on task mutations.
- **Event-driven re-renders.** SSE events update a React context store — only affected components re-render.
- **Code splitting.** The Gantt chart (`@/features/gantt`) is lazy-loaded only when the user enables the Gantt panel.
- **Virtualization.** For projects with 100+ tasks, the task table and Gantt bar list use windowed rendering.

---

## 10. Docker Compose (Local Development)

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17.5-alpine
    container_name: ganttx-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: ganttx
      POSTGRES_USER: ganttx
      POSTGRES_PASSWORD: ganttx_dev_password
    volumes:
      - ganttx_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ganttx -d ganttx"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  ganttx_pgdata:
    driver: local
```

### Connection String

```env
# .env.local
DATABASE_URL="postgresql://ganttx:ganttx_dev_password@localhost:5432/ganttx?schema=public"
```

---

## 11. Environment Variables

| Variable                | Description                          | Required |
| ----------------------- | ------------------------------------ | -------- |
| `DATABASE_URL`          | PostgreSQL connection string          | Yes      |
| `AUTH_SECRET`           | Auth.js encryption secret            | Yes      |
| `AUTH_GOOGLE_ID`        | Google OAuth client ID               | Yes      |
| `AUTH_GOOGLE_SECRET`    | Google OAuth client secret           | Yes      |
| `NEXTAUTH_URL`          | Canonical app URL (dev: localhost)    | Yes      |

---

## 12. Development Workflow

```bash
# 1. Start the database
docker compose up -d

# 2. Install dependencies
bun install

# 3. Generate Prisma Client
bunx prisma generate

# 4. Apply migrations (or db push for initial prototyping)
bunx prisma migrate dev

# 5. Start the dev server
bun run dev
```

### Database Commands

| Command                                    | Use Case                                    |
| ------------------------------------------ | ------------------------------------------- |
| `bunx prisma migrate dev --name <change>`  | Create and apply a new migration             |
| `bunx prisma migrate deploy`               | Apply pending migrations (CI/production)     |
| `bunx prisma db push`                      | Quick sync during early prototyping ONLY     |
| `bunx prisma studio`                       | Visual database browser at localhost:5555    |
| `bunx prisma generate`                     | Regenerate client after schema changes       |

---

## 13. Security Considerations

- **Auth middleware.** Every `(dashboard)` route is protected. No server-side data access without a valid session.
- **Role enforcement.** Server Actions check project membership and role before any mutation. Client-side role checks are UX hints only — never trust them.
- **Input validation.** Every Server Action validates input with Zod before touching the database.
- **SQL injection.** Prisma parameterizes all queries by default.
- **CSRF.** Server Actions use POST with origin validation built into Next.js.
- **Secrets isolation.** Data access modules import `server-only` to prevent accidental client bundling.
- **Security headers.** Middleware injects `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy`.

---

## 14. Future Considerations

These are explicitly **out of scope** for the initial release but architecturally accounted for:

| Feature                  | Preparation                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| Task dependencies        | `Task` model can add a self-relation `dependsOn Task[]`             |
| Subtasks                 | `parentTaskId` nullable FK on `Task`                                |
| File attachments         | Separate `Attachment` model + S3-compatible storage                 |
| Notifications            | `Notification` model + push via SSE events                          |
| Activity log             | `AuditLog` model with before/after JSONB snapshots                  |
| Redis Pub/Sub            | Replace `EventEmitter` in `src/lib/events.ts` for horizontal scale  |
| Mobile responsive        | Tailwind breakpoints already support mobile-first design            |
| Export (CSV/PDF)          | Server Action generating file stream, download via Route Handler    |
