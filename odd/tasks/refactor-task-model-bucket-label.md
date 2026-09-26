# Refactor Task Model: bucket, label, and remove milestone

## Problem & Objective
The user clarified the domain language and requirements for `Task`:
1. `status` must be renamed to `bucket` (representing the Kanban column/bucket), with NO default value.
2. `priority` must be renamed to `label` (representing custom tags/labels).
3. `isMilestone` is not functional and must be removed completely.

## Tasks
- [x] Task 1: DDL migration and update `prisma/schema.prisma` (rename columns, drop default, drop `is_milestone`, generate client).
- [x] Task 2: Update task types and schemas in `src/features/tasks/types/task.types.ts`.
- [x] Task 3: Update data access in `src/features/tasks/api/get-tasks.ts` and mutations in `src/features/tasks/api/task-mutations.ts`.
- [x] Task 4: Update task components (`task-card.tsx`, `task-bucket-column.tsx`, `task-form-dialog.tsx`, `task-board.tsx`, `task-table.tsx`, `task-row.tsx`, badges).
- [x] Task 5: Update Gantt and Calendar components consuming `TaskDTO`.
- [x] Task 6: Verify full project with `bun run lint` (passed) and `bun run build` (passed).

