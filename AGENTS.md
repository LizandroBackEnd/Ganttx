# Ganttx — Agent Operating Manual

Ganttx is a collaborative real-time project management application built on Next.js App Router with React Server Components, Prisma, and Tailwind CSS. It renders interactive Gantt charts and calendar views, synchronized across all connected project members via Server-Sent Events.

You are the guardian of its **Screaming Architecture**: the directory structure must reveal the business domain at a glance. Every file you create must make the domain feature obvious and must keep client-side JavaScript to a minimum.

## Stack (pinned — do not upgrade without being asked)

| Concern         | Choice                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------- |
| Framework       | Next.js `16.3.5`, App Router only                                                        |
| UI runtime      | React `19.2.8` / React DOM `19.2.8`                                                      |
| Language        | TypeScript `^5`, `strict: true`, alias `@/*` → `./src/*`                                 |
| Styling         | Tailwind CSS `^4` via `@tailwindcss/postcss` (CSS-first config, no `tailwind.config.js`) |
| Component lib   | shadcn/ui (Radix UI primitives, CVA variants, `cn` merging)                              |
| Persistence     | Prisma CLI `^8.0.0-rc` with `@prisma/client` `^7.10`                                     |
| Database        | PostgreSQL `17.5-alpine` (Docker Compose)                                                |
| Authentication  | Auth.js (NextAuth v5) — Google OAuth only, Prisma adapter                                |
| Real-time       | Server-Sent Events (SSE) via Route Handler + in-process EventEmitter                     |
| Validation      | Zod `^3` for Server Action and API input validation                                      |
| Package manager | Bun `1.3.0` — use `bun`, `bunx`, `bun run`; never `npm`, `yarn`, or `pnpm`               |
| Lint            | ESLint `^9` flat config (`eslint.config.mjs`)                                            |
| Local services  | Docker Compose (`docker-compose.yml`)                                                    |

Commands: `bun run dev`, `bun run build`, `bun run start`, `bun run lint`.

## Authority order

When guidance collides, follow this order and say out loud which source you applied:

1. This file.
2. `.agents/rules/*.mdc` — always applied, non-negotiable.
3. `.agents/skills/*/SKILL.md` — read the matching skill before doing that kind of work.
4. `docs/ARCHITECTURE.md` and `docs/DATA-MODEL.md` — authoritative for system design and data model.
5. `node_modules/next/dist/docs/` — authoritative for Next.js API surface, which changed in this version.
6. Your prior knowledge — lowest priority, and often stale for Next 16 / React 19 / Prisma 8 / Tailwind 4.

### Rules (read as constraints, they are already in your context)

| Rule file                        | Scope                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `next-development-guide.mdc`     | RSC defaults, `'use client'` at leaf nodes, Server Actions, asset optimization     |
| `typescript-development-guide.mdc` | No `any`, no `!`, explicit return types on exports, `interface` for object shapes |
| `prisma-development-guide.mdc`   | Schema naming and mapping, singleton client, no N+1, cursor pagination, migrations |
| `tailwind-development-guide.mdc` | No dynamic class strings, CVA variants, `cn` merging, mobile-first                |
| `docker-development-guide.mdc`   | Non-root, pinned images, healthcheck-gated dependencies                            |

### Skills (read the SKILL.md file before starting that task)

| Task                                               | Skill                                  |
| -------------------------------------------------- | -------------------------------------- |
| Routes, Server Components, Server Actions, caching | `.agents/skills/next/SKILL.md`         |
| Types, generics, narrowing, tsconfig               | `.agents/skills/typescript/SKILL.md`   |
| Schema, queries, migrations                        | `.agents/skills/prisma/SKILL.md`       |
| Component styling and variants                     | `.agents/skills/tailwind/SKILL.md`     |
| Images, compose services, containerization         | `.agents/skills/docker/SKILL.md`       |

## Architecture: Screaming Architecture

This project follows **Screaming Architecture** (Robert C. Martin). The top-level source directories scream the business domain — not the framework. When you open `src/features/`, you immediately see `auth/`, `projects/`, `tasks/`, `calendar/`, `gantt/` — the bounded contexts of the application.

### Core principles

1. **Package by feature, not by layer.** No `controllers/`, `services/`, `repositories/` top-level folders. Each feature owns its own components, hooks, types, API access, and use-cases.
2. **Barrel boundaries.** Every feature exposes a public API through `index.ts`. External consumers import only from the barrel — never reach into feature internals.
3. **Dependency direction.** `shared/` → `features/` → `app/`. Never backwards, never sideways between sibling features.
4. **Thin delivery layer.** `src/app/` contains only routing, layouts, and page composition. Zero business logic.

### Directory layout

```
src/
  app/                              # routing + composition only
    (auth)/
      login/page.tsx
      layout.tsx
    (dashboard)/
      layout.tsx                    # sidebar + top nav shell
      page.tsx                      # project list / home
      projects/[projectId]/
        layout.tsx                  # project-scoped layout with SSE provider
        page.tsx                    # default view (Month calendar)
        loading.tsx
        settings/page.tsx
    api/
      auth/[...nextauth]/route.ts   # Auth.js catch-all
      projects/[projectId]/events/
        route.ts                    # SSE endpoint for real-time sync
    layout.tsx                      # root layout
    globals.css                     # Tailwind v4 @import + @theme tokens
  features/
    auth/
      index.ts                      # public barrel
      components/
      lib/
    projects/
      index.ts
      api/                          # data access (server-only)
      components/
      types/
    tasks/
      index.ts
      api/
      components/
      hooks/
      types/
    calendar/
      index.ts
      components/
      hooks/
      types/
    gantt/
      index.ts
      components/
      hooks/
      types/
  shared/
    components/ui/                  # shadcn/ui primitives (button, input, dialog…)
    hooks/
  lib/
    prisma.ts                       # PrismaClient singleton on globalThis
    cn.ts                           # clsx + tailwind-merge
    auth.ts                         # Auth.js instance export
    events.ts                       # In-process EventEmitter for SSE broadcast
    constants.ts                    # App-wide constants (roles, statuses, priorities)
prisma/
  schema.prisma
  migrations/
docs/
  ARCHITECTURE.md                   # System architecture and design decisions
  DATA-MODEL.md                     # Prisma schema design and rationale
docker-compose.yml
```

### Placement decision (the scope rule)

Before creating any file, answer: **how many features consume this?**

- One feature → it lives inside that feature, in the matching subdirectory. Do not "promote" it preemptively.
- Two or more features → move it to `src/shared/` only if it carries zero domain knowledge; otherwise one feature owns it and exposes it through its barrel.
- Domain-agnostic and used by three or more bounded contexts → `src/lib/` or `src/shared/`.

State the count and the resulting placement when you add a file. A misplaced file is a review blocker, not a nitpick.

### Import boundaries

```ts
// CORRECT — through the feature barrel
import { TaskForm, createTask } from "@/features/tasks";

// INCORRECT — reaching into a feature's internals
import { TaskForm } from "@/features/tasks/components/task-form";
```

Dependencies flow `shared` → `features` → `app`, never backwards, never sideways between sibling features. If `calendar` and `gantt` both need a date utility, compose them in `src/app/` or move the shared piece down into `shared/` or `lib/`.

## Non-negotiable practices

**Server first.** Every component is a Server Component until proven otherwise. `'use client'` belongs on the smallest interactive leaf — never on `layout.tsx` or `page.tsx`. To render server UI inside a client shell, pass it as `children`. Import `server-only` in every data-access module.

**Data fetching.** Fetch in async Server Components. Independent fetches run through `Promise.all`. Wrap slow branches in `<Suspense>` with a skeleton. No `useEffect` fetching for initial render.

**Mutations.** Internal writes use Server Actions with Zod validation of every input, followed by `revalidatePath`/`revalidateTag`, then `redirect` if needed. `route.ts` handlers are reserved for SSE streaming and external clients only.

**Database.** Import the singleton from `@/lib/prisma`, never construct `PrismaClient` inline. Always `select` the fields you need. Never query inside a loop. Use `tx` inside transactions. Schema changes go through `bunx prisma migrate dev --name <change>`; `db push` is forbidden outside throwaway local experiments. Never let a Prisma row cross into a component — map it to a DTO at the feature's `api/` boundary.

**Types.** `any` and `!` are banned. Model multi-state UI as discriminated unions on a `status` field, not parallel booleans. Exported functions carry explicit return types.

**Styling.** Class strings are always literal — never interpolated. Multi-variant components use CVA; consumer `className` props always go through `cn()`. Build mobile-first and reach for theme tokens before arbitrary values.

**Files.** `kebab-case` names, named exports only. The one exception is Next's required route files (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `loading.tsx`, `route.ts`), which must use default exports.

## Commit convention

Follow **Angular Conventional Commits** strictly. Every commit message must match:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Types

| Type       | When to use                                              |
| ---------- | -------------------------------------------------------- |
| `feat`     | A new feature or user-facing behavior                    |
| `fix`      | A bug fix                                                |
| `docs`     | Documentation only (ARCHITECTURE.md, README, comments)   |
| `style`    | Formatting, missing semicolons — no logic change          |
| `refactor` | Code change that neither fixes a bug nor adds a feature  |
| `perf`     | Performance improvement                                  |
| `test`     | Adding or correcting tests                               |
| `build`    | Build system, dependencies, Docker, CI config            |
| `ci`       | CI pipeline changes                                      |
| `chore`    | Maintenance tasks, tooling, no production code change    |
| `revert`   | Reverts a previous commit                                |

### Scopes (match feature boundaries)

Use the feature name as scope: `auth`, `projects`, `tasks`, `calendar`, `gantt`, `shared`, `lib`, `prisma`, `docker`, `deps`.

### Examples

```
feat(tasks): add drag-to-reschedule on Gantt bars
fix(calendar): correct off-by-one in month boundary calculation
docs(architecture): update directory layout after adding gantt feature
refactor(projects): extract member permission check to shared util
build(docker): pin postgres to 17.5-alpine
chore(deps): update prisma to 8.0.0-rc.2
```

### Rules

- Subject line: imperative mood, lowercase, no period, max 72 characters.
- Body: wrap at 80 characters, explain _why_ not _what_.
- Breaking changes: add `BREAKING CHANGE:` footer or `!` after type/scope.
- No "Co-Authored-By" or AI attribution — ever.
- One logical change per commit. If a commit touches more than one feature scope, split it.

## Working agreement

- Read the relevant skill in `.agents/skills/` before starting any task that matches a skill trigger.
- Read the relevant rule in `.agents/rules/` — they are constraints, not suggestions.
- Run `bun run lint` and `bun run build` before declaring work finished.
- Keep `docs/ARCHITECTURE.md` and `docs/DATA-MODEL.md` current when you introduce a feature module, change a boundary, or modify the schema.

## Current state

The repository is freshly scaffolded. `src/app/` holds only the starter `layout.tsx`, `page.tsx`, and `globals.css` (not yet moved to `src/`). `src/features/`, `src/shared/`, `src/lib/`, and `prisma/schema.prisma` do not exist yet. `docs/ARCHITECTURE.md` and `docs/DATA-MODEL.md` contain the full architectural design and data model proposal. `docker-compose.yml` is configured with PostgreSQL 17.5-alpine. Create source directories as the first feature demands them rather than scaffolding empty directories up front.
