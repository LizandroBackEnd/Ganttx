# Feature: Task Modal Comments Lateral Chat Panel

## Objective
Add a lateral comments panel on the right side of `TaskFormDialog` allowing project members to converse and comment on a specific task like a chat, persisted in the PostgreSQL database via Prisma.

## Constraints & Requirements
- Screaming Architecture compliance (`src/features/tasks/`).
- Database model `TaskComment` adhering to `prisma-clean-architecture` (UUID, snake_case mapping, Timestamptz, index on `taskId` and `authorId`).
- Non-breaking migration applied cleanly to PostgreSQL and client regenerated.
- Responsive modal: wide modal (`max-w-5xl`) with form on the left (~60-65%) and comments panel on the right (~35-40%), stacked gracefully on smaller screens.
- Chat UI with author avatar, member name, relative time, message bubble, and message input with Enter/Send.
- Verification with `bun run lint` and `bun run build`.

## Tasks
- [x] TASK-1: Update Prisma schema with `TaskComment` model, migrate PostgreSQL, and regenerate client.
- [x] TASK-2: Define `TaskCommentDTO` in `task.types.ts` and implement `getTaskComments` & `createTaskComment` server actions in `task-mutations.ts`.
- [x] TASK-3: Build `TaskCommentsPanel` component with scrollable chat feed, bubbles, empty state, and send input.
- [x] TASK-4: Integrate `TaskCommentsPanel` into `TaskFormDialog` as a right-hand lateral panel.
- [x] TASK-5: Run lint and build verification.
- [x] TASK-6: Fix stale PrismaClient instance in dev environment, pass user avatar image, and rename "tarjeta" to "tarea".
