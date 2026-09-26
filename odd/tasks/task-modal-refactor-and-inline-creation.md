# Feature: Task Modal Refactor, Inline Bucket Creation & Schema Cleanup

## Objective
Refactor the task creation and editing experience by:
1. Enabling fast inline task creation inside bucket columns ("+ Añade una tarjeta").
2. Redesigning `TaskFormDialog` with the Epic section at the top, dynamic header reflecting task title, auto-saving without explicit Create/Cancel buttons, and adding Milestone (Hito) support.
3. Cleaning up obsolete fields from Prisma schema and frontend (`customId`, `requirement`, `durationDays`), and renaming `sprint` to `iteration`.

## Constraints & Requirements
- Screaming Architecture compliance (`src/features/tasks/`).
- TypeScript strict typing, no `any`, no `!`.
- Auto-save in `TaskFormDialog` via debounced server updates with discreet saving indicator.
- Support close via header X or backdrop click.
- Prisma schema migration with `bunx prisma migrate dev --name task_schema_cleanup_and_milestone`.
- Conventional commits with feature scope (`feat(tasks)` or `feat(prisma)`).

## Tasks
- [x] TASK-1: Update Prisma schema (remove `customId`, `requirement`, `durationDays`, rename `sprint` -> `iteration`, add `isMilestone`), generate migration and Prisma client.
- [x] TASK-2: Update task DTOs, Zod schemas, server actions in `src/features/tasks/types/task.types.ts`, `task-mutations.ts`, and `get-tasks.ts`.
- [x] TASK-3: Implement inline task creation in `TaskBucketColumn` (`task-bucket-column.tsx`) that creates the task and seamlessly opens the modal for further detail.
- [x] TASK-4: Redesign `TaskFormDialog` (`task-form-dialog.tsx`): Epic section first, dynamic title header, remove ID/Requirement/Duration, rename Actividad->Nombre, Sprint->Iteración, add Milestone toggle, remove Cancel/Save buttons, implement auto-save on change/blur with saving feedback.
- [x] TASK-5: Update task cards, tables, gantt, and calendar to reference `iteration` and `isMilestone`, removing references to `customId`/`requirement`.
- [x] TASK-6: Verification and lint checks (`bun run lint`, `bun run build`).

## Verification Evidence
- `bun run lint` passed with 0 errors / 0 warnings.
- `bun run build` completed successfully, compiling all static and dynamic routes.
- Subtareas tab with inline adding row and table layout matching user screenshot verified.
- Direct inline editable title in modal header, removing trash icon and auto-save descriptive subtitle.
- Reordered fields: Asignado (left) & Etiquetas (right), Fechas (inicio left, fin right), Predecesoras & Hito (Milestone), and Tabs (Descripción/Subtareas).
- Iteración field completely purged from Prisma schema, PostgreSQL database column dropped, and cleaned from all frontend types, schemas, and views.
