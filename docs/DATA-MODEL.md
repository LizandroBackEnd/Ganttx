# Ganttx — Data Model

> Complete Prisma schema design with rationale for every model, field, relation, and index.

---

## 1. Database Engine

| Property     | Value                   |
| ------------ | ----------------------- |
| Engine       | PostgreSQL              |
| Version      | `17.5-alpine`           |
| Container    | `postgres:17.5-alpine`  |
| Default DB   | `ganttx`                |
| Schema       | `public`                |

PostgreSQL 17.5 provides:

- Native `uuid` type for primary keys without extensions (v4 via `gen_random_uuid()`).
- `timestamptz` for timezone-aware timestamps.
- Native enum types enforced at the database level.
- `LISTEN/NOTIFY` as a future real-time scaling path.

---

## 2. Design Conventions

| Convention        | Rule                                                                         |
| ----------------- | ---------------------------------------------------------------------------- |
| Model names       | Singular PascalCase (`User`, `Task`, `ProjectMember`)                        |
| Field names       | camelCase in Prisma (`startDate`, `createdAt`)                               |
| Table names       | Plural snake_case via `@@map` (`users`, `tasks`, `project_members`)          |
| Column names      | snake_case via `@map` (`start_date`, `created_at`)                           |
| Primary keys      | UUID v4 via `@default(uuid())` with `@db.Uuid`                              |
| Timestamps        | `@db.Timestamptz` for timezone-aware storage                                 |
| Soft deletes      | Not used — hard deletes with cascade rules for simplicity in v1              |
| Enums             | Native PostgreSQL enums, not string constants                                |
| Join tables       | Explicit models with composite `@@id`, never implicit many-to-many           |
| Foreign keys      | Always indexed via `@@index`                                                 |

---

## 3. Entity-Relationship Diagram

```
┌──────────────┐       ┌───────────────────┐       ┌──────────────┐
│   Account    │       │      User         │       │   Session    │
│──────────────│       │───────────────────│       │──────────────│
│ id           │       │ id           (PK) │       │ id           │
│ userId    (FK)├──────►│ name              │◄──────┤ userId   (FK)│
│ provider     │       │ email        (UQ) │       │ sessionToken │
│ providerAccId│       │ emailVerified     │       │ expires      │
│ type         │       │ image             │       └──────────────┘
│ access_token │       │ createdAt         │
│ refresh_token│       │ updatedAt         │
│ expires_at   │       └────────┬──────────┘
└──────────────┘                │
                                │ 1
                                │
                    ┌───────────┼────────────┐
                    │           │            │
                    ▼ N         ▼ N          ▼ N
        ┌───────────────┐ ┌──────────┐ ┌──────────┐
        │ProjectMember  │ │  Task    │ │  Task    │
        │───────────────│ │(creator) │ │(assignee)│
        │ userId    (FK)│ └──────────┘ └──────────┘
        │ projectId (FK)│
        │ role (enum)   │
        │ joinedAt      │
        └───────┬───────┘
                │
                │ N
                │
                ▼ 1
        ┌───────────────┐
        │   Project     │
        │───────────────│
        │ id       (PK) │
        │ name          │
        │ description   │
        │ createdAt     │
        │ updatedAt     │
        └───────┬───────┘
                │ 1
                │
                ▼ N
        ┌───────────────────────────────────────┐
        │              Task                     │
        │───────────────────────────────────────│
        │ id            (PK)                    │
        │ title                                 │
        │ description                           │
        │ priority      (enum: LOW/MED/HIGH/URG)│
        │ status        (enum: TODO/PROG/DONE/…)│
        │ progress      (Int 0-100)             │
        │ startDate                              │
        │ dueDate                                │
        │ projectId     (FK → Project)          │
        │ assigneeId    (FK → User, nullable)   │
        │ creatorId     (FK → User)             │
        │ createdAt                              │
        │ updatedAt                              │
        └───────────────────────────────────────┘
```

### Relationship Summary

| Relationship                | Type    | Cardinality | Notes                                       |
| --------------------------- | ------- | ----------- | ------------------------------------------- |
| User → Account              | 1 → N  | One-to-Many | Auth.js managed, one per OAuth provider      |
| User → Session              | 1 → N  | One-to-Many | Auth.js managed, database session strategy   |
| User → ProjectMember        | 1 → N  | One-to-Many | A user can be a member of many projects      |
| Project → ProjectMember     | 1 → N  | One-to-Many | A project has many members                   |
| Project → Task              | 1 → N  | One-to-Many | Tasks belong to exactly one project          |
| User → Task (creator)       | 1 → N  | One-to-Many | Every task has a creator                     |
| User → Task (assignee)      | 1 → N  | One-to-Many | A task may or may not have an assignee       |

---

## 4. Enum Definitions

### ProjectRole

Controls what a member can do within a project.

| Value    | Permissions                                                           |
| -------- | --------------------------------------------------------------------- |
| `OWNER`  | Full control: delete project, manage all members, all task operations |
| `ADMIN`  | Invite/remove members (except Owner), all task operations             |
| `MEMBER` | Create, edit, and delete own tasks; edit assigned tasks               |

### TaskPriority

Urgency classification for tasks.

| Value    | Display   | Sort Order |
| -------- | --------- | ---------- |
| `LOW`    | Low       | 0          |
| `MEDIUM` | Medium    | 1          |
| `HIGH`   | High      | 2          |
| `URGENT` | Urgent    | 3          |

### TaskStatus

Workflow state of a task.

| Value         | Display       | Semantics                              |
| ------------- | ------------- | -------------------------------------- |
| `TODO`        | To Do         | Not started, in backlog                |
| `IN_PROGRESS` | In Progress   | Actively being worked on               |
| `IN_REVIEW`   | In Review     | Completed work awaiting validation     |
| `DONE`        | Done          | Accepted and finished                  |
| `CANCELLED`   | Cancelled     | Explicitly abandoned                   |

---

## 5. Complete Prisma Schema

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

enum ProjectRole {
  OWNER
  ADMIN
  MEMBER
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
  CANCELLED
}

// ─────────────────────────────────────────────
// Auth.js Models (required by @auth/prisma-adapter)
// ─────────────────────────────────────────────

model User {
  id            String    @id @default(uuid()) @db.Uuid
  name          String?   @db.VarChar(100)
  email         String    @unique @db.VarChar(255)
  emailVerified DateTime? @map("email_verified") @db.Timestamptz
  image         String?   @db.Text
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // Auth.js relations
  accounts Account[]
  sessions Session[]

  // Domain relations
  memberships   ProjectMember[]
  createdTasks  Task[]          @relation("TaskCreator")
  assignedTasks Task[]          @relation("TaskAssignee")

  @@index([email])
  @@map("users")
}

model Account {
  id                String  @id @default(uuid()) @db.Uuid
  userId            String  @map("user_id") @db.Uuid
  type              String  @db.VarChar(50)
  provider          String  @db.VarChar(50)
  providerAccountId String  @map("provider_account_id") @db.VarChar(255)
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String? @db.VarChar(50)
  scope             String? @db.Text
  id_token          String? @db.Text
  session_state     String? @db.VarChar(255)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(uuid()) @db.Uuid
  sessionToken String   @unique @map("session_token") @db.VarChar(255)
  userId       String   @map("user_id") @db.Uuid
  expires      DateTime @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

model VerificationToken {
  identifier String   @db.VarChar(255)
  token      String   @unique @db.VarChar(255)
  expires    DateTime @db.Timestamptz

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ─────────────────────────────────────────────
// Domain Models
// ─────────────────────────────────────────────

model Project {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @db.VarChar(100)
  description String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz

  members ProjectMember[]
  tasks   Task[]

  @@index([createdAt])
  @@map("projects")
}

model ProjectMember {
  userId    String      @map("user_id") @db.Uuid
  projectId String      @map("project_id") @db.Uuid
  role      ProjectRole @default(MEMBER)
  joinedAt  DateTime    @default(now()) @map("joined_at") @db.Timestamptz

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@id([userId, projectId])
  @@index([projectId])
  @@index([userId])
  @@map("project_members")
}

model Task {
  id          String       @id @default(uuid()) @db.Uuid
  title       String       @db.VarChar(255)
  description String?      @db.Text
  priority    TaskPriority @default(MEDIUM)
  status      TaskStatus   @default(TODO)
  progress    Int          @default(0) @db.SmallInt
  startDate   DateTime     @map("start_date") @db.Date
  dueDate     DateTime     @map("due_date") @db.Date
  projectId   String       @map("project_id") @db.Uuid
  assigneeId  String?      @map("assignee_id") @db.Uuid
  creatorId   String       @map("creator_id") @db.Uuid
  createdAt   DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee User?   @relation("TaskAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)
  creator  User    @relation("TaskCreator", fields: [creatorId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([assigneeId])
  @@index([creatorId])
  @@index([projectId, status])
  @@index([projectId, startDate])
  @@index([projectId, dueDate])
  @@map("tasks")
}
```

---

## 6. Schema Design Decisions

### 6.1 Why UUID over Auto-Increment

| Criteria               | UUID v4                        | Auto-Increment (SERIAL)       |
| ---------------------- | ------------------------------ | ----------------------------- |
| Client-side generation | Yes — IDs can be created in JS | No — requires a DB round-trip |
| Merge safety           | No collisions across instances | Collisions on multi-master    |
| URL enumeration        | Not guessable                  | Sequential, predictable       |
| Index performance      | Slightly larger B-tree nodes   | Compact, sequential inserts   |

**Decision:** UUID v4. The ability to generate IDs client-side enables optimistic inserts without a server round-trip, which is critical for the Gantt drag-and-drop UX. PostgreSQL 17 generates UUIDs natively without the `uuid-ossp` extension.

### 6.2 Why Explicit Join Table for ProjectMember

An implicit Prisma many-to-many (`projects Project[]` / `members User[]`) would work but:

- Cannot store the `role` field on the relation.
- Cannot store `joinedAt` metadata.
- Cannot add composite indexes for query optimization.
- Cannot enforce business rules at the schema level.

The explicit `ProjectMember` model with `@@id([userId, projectId])` guarantees a user cannot be added to the same project twice and allows role-specific queries.

### 6.3 Task Date Fields

| Field       | Type      | Prisma Type | Rationale                                                    |
| ----------- | --------- | ----------- | ------------------------------------------------------------ |
| `startDate` | `DATE`    | `@db.Date`  | Gantt bars and calendar placement need calendar dates, not timestamps |
| `dueDate`   | `DATE`    | `@db.Date`  | Same — time precision is unnecessary for project scheduling  |
| `createdAt` | `TIMESTAMPTZ` | `@db.Timestamptz` | Audit trail needs full precision with timezone       |
| `updatedAt` | `TIMESTAMPTZ` | `@db.Timestamptz` | Same                                                  |

Using `@db.Date` for scheduling fields keeps the Gantt chart logic simple — no timezone conversion headaches when rendering bars. The Prisma client maps `Date` columns to JavaScript `Date` objects at midnight UTC.

### 6.4 Progress as SmallInt

`progress Int @default(0) @db.SmallInt` stores a percentage (0–100). Using `SmallInt` (2 bytes) instead of `Int` (4 bytes) saves storage on large task tables. Validation that the value stays in the 0–100 range is enforced at the application layer via Zod schemas, not database constraints, because the error messages need to be user-friendly.

### 6.5 OnDelete Cascade Rules

| Relation                      | Rule       | Rationale                                                    |
| ----------------------------- | ---------- | ------------------------------------------------------------ |
| User → Account                | `Cascade`  | Deleting a user removes their OAuth accounts                 |
| User → Session                | `Cascade`  | Deleting a user invalidates all sessions                     |
| User → ProjectMember          | `Cascade`  | Deleting a user removes their memberships                    |
| User → Task (creator)         | `Cascade`  | If a user is deleted, their created tasks are removed        |
| User → Task (assignee)        | `SetNull`  | If an assignee is deleted, the task persists unassigned       |
| Project → ProjectMember       | `Cascade`  | Deleting a project removes all memberships                   |
| Project → Task                | `Cascade`  | Deleting a project removes all its tasks                     |

The `SetNull` on assignee deletion is intentional: a task should survive even if the person assigned to it leaves the project. The task becomes unassigned and can be reassigned by any member.

### 6.6 Index Strategy

| Index                            | Query Pattern                                             |
| -------------------------------- | --------------------------------------------------------- |
| `User.email` (`@unique`)        | Login lookup, invite-by-email search                      |
| `Account.[provider, providerAccountId]` (`@@unique`) | OAuth account resolution          |
| `Session.sessionToken` (`@unique`) | Session validation on every request                    |
| `ProjectMember.[userId, projectId]` (`@@id`) | Membership check, composite PK           |
| `ProjectMember.projectId`       | List all members of a project                             |
| `ProjectMember.userId`          | List all projects for a user                              |
| `Task.projectId`                | Fetch all tasks in a project                              |
| `Task.[projectId, status]`      | Filter tasks by status within a project                   |
| `Task.[projectId, startDate]`   | Calendar/Gantt view: tasks starting in a date range       |
| `Task.[projectId, dueDate]`     | Calendar/Gantt view: tasks due in a date range            |
| `Task.assigneeId`               | "My tasks" view across projects                           |
| `Task.creatorId`                | "Created by me" filter                                    |

The composite indexes on `[projectId, status]`, `[projectId, startDate]`, and `[projectId, dueDate]` are the most critical — they directly serve the calendar and Gantt chart queries that filter tasks within a project by date range and status.

---

## 7. Query Patterns

### 7.1 Fetch Tasks for Calendar View

```typescript
// Fetch tasks for a specific month within a project
const tasks = await prisma.task.findMany({
  where: {
    projectId,
    OR: [
      {
        startDate: { gte: monthStart, lte: monthEnd },
      },
      {
        dueDate: { gte: monthStart, lte: monthEnd },
      },
      {
        AND: [
          { startDate: { lte: monthStart } },
          { dueDate: { gte: monthEnd } },
        ],
      },
    ],
  },
  select: {
    id: true,
    title: true,
    priority: true,
    status: true,
    progress: true,
    startDate: true,
    dueDate: true,
    assignee: {
      select: {
        id: true,
        name: true,
        image: true,
      },
    },
  },
  orderBy: { startDate: "asc" },
});
```

The `OR` clause with three conditions captures tasks that:
1. **Start** within the visible range.
2. **End** within the visible range.
3. **Span** the entire visible range (started before, ends after).

This ensures the Gantt chart and calendar never miss a task that partially overlaps the viewport.

### 7.2 Check Membership with Role

```typescript
// Verify user is a member of the project and retrieve their role
const membership = await prisma.projectMember.findUnique({
  where: {
    userId_projectId: {
      userId: session.user.id,
      projectId,
    },
  },
  select: {
    role: true,
  },
});

if (!membership) {
  return { success: false, error: "Not a member of this project" };
}

if (membership.role === "MEMBER" && requiresAdmin) {
  return { success: false, error: "Insufficient permissions" };
}
```

### 7.3 Invite Member by Email

```typescript
// Find user by Google email and add to project
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.findUnique({
    where: { email: inviteeEmail },
    select: { id: true },
  });

  if (!user) {
    throw new Error("User not found. They must sign in with Google first.");
  }

  return await tx.projectMember.create({
    data: {
      userId: user.id,
      projectId,
      role: "MEMBER",
    },
  });
});
```

---

## 8. Migration Workflow

### Initial Setup

```bash
# 1. Ensure PostgreSQL is running
docker compose up -d

# 2. Create initial migration from schema
bunx prisma migrate dev --name initial_schema

# 3. Verify with Prisma Studio
bunx prisma studio
```

### Schema Changes

```bash
# 1. Edit prisma/schema.prisma
# 2. Generate migration
bunx prisma migrate dev --name add_task_color_field

# 3. Regenerate client types
bunx prisma generate
```

### Production Deployment

```bash
# Apply pending migrations without interactive prompts
bunx prisma migrate deploy
```

### Rules

- **Never** use `prisma db push` outside of local throwaway experiments.
- **Always** name migrations descriptively: `add_task_dependencies`, `create_notification_model`.
- **Never** edit a migration SQL file after it has been applied to any environment.
- Adding a required non-nullable column to an existing table with data requires a 3-phase approach: add as optional → backfill → make required.

---

## 9. Seed Data (Development)

```typescript
// prisma/seed.ts
import { PrismaClient, ProjectRole, TaskPriority, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Create a dev user (simulates Google OAuth user)
  const user = await prisma.user.upsert({
    where: { email: "dev@ganttx.local" },
    update: {},
    create: {
      name: "Dev User",
      email: "dev@ganttx.local",
      image: null,
    },
  });

  // Create a sample project
  const project = await prisma.project.create({
    data: {
      name: "Ganttx MVP",
      description: "Build the first version of Ganttx",
      members: {
        create: {
          userId: user.id,
          role: ProjectRole.OWNER,
        },
      },
    },
  });

  // Create sample tasks
  const today = new Date();
  const tasks = [
    {
      title: "Set up authentication",
      priority: TaskPriority.HIGH,
      status: TaskStatus.DONE,
      progress: 100,
      startDate: new Date(today.getFullYear(), today.getMonth(), 1),
      dueDate: new Date(today.getFullYear(), today.getMonth(), 5),
    },
    {
      title: "Design database schema",
      priority: TaskPriority.HIGH,
      status: TaskStatus.DONE,
      progress: 100,
      startDate: new Date(today.getFullYear(), today.getMonth(), 3),
      dueDate: new Date(today.getFullYear(), today.getMonth(), 7),
    },
    {
      title: "Build calendar view",
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.IN_PROGRESS,
      progress: 40,
      startDate: new Date(today.getFullYear(), today.getMonth(), 8),
      dueDate: new Date(today.getFullYear(), today.getMonth(), 18),
    },
    {
      title: "Implement Gantt chart",
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      progress: 0,
      startDate: new Date(today.getFullYear(), today.getMonth(), 15),
      dueDate: new Date(today.getFullYear(), today.getMonth(), 25),
    },
    {
      title: "Add real-time sync",
      priority: TaskPriority.URGENT,
      status: TaskStatus.TODO,
      progress: 0,
      startDate: new Date(today.getFullYear(), today.getMonth(), 20),
      dueDate: new Date(today.getFullYear(), today.getMonth(), 28),
    },
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: {
        ...task,
        projectId: project.id,
        creatorId: user.id,
      },
    });
  }

  console.log(`Seeded: 1 user, 1 project, ${tasks.length} tasks`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```
