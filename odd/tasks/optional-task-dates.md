# Feature: Optional Task and Subtask Dates

## Objective
Allow tasks and subtasks to have empty/optional start and due dates (`startDate` and `dueDate`). Tasks without dates will not be scheduled in the Gantt timeline or calendar views, and can be cleared in the task modal without validation errors.

## Problem & Why
Currently, `startDate` and `dueDate` are required (`NOT NULL` in PostgreSQL and mandatory in Zod schemas and dialog state). In real-world project management, users often capture backlog items, ideas, or unscheduled tasks/subtasks before deciding their timelines. Forcing dates creates artificial deadlines and clutters the Gantt timeline.

## Constraints & Scope
- Screaming Architecture rules: maintain boundaries `shared/` -> `features/` -> `app/`.
- Conventional commits with appropriate scopes (`prisma`, `tasks`, `gantt`, `calendar`).
- TypeScript strictness: no `any`, no `!`, explicit return types.
- Ensure Gantt chart and Calendar views filter or safely ignore tasks without dates rather than crashing with `NaN` or `slice/split on null`.
- Do not run unverified remote migrations; write the migration SQL cleanly and run Prisma generate.

## Actionable Checklist
- [x] TASK-1: Update Prisma schema (`prisma/schema.prisma`) to make `startDate` and `dueDate` optional (`DateTime?`), create migration SQL, and run `bunx prisma generate`.
- [x] TASK-2: Update Task DTOs and Zod validation schemas in `src/features/tasks/types/task.types.ts` to support nullable/optional dates.
- [x] TASK-3: Update backend data access and mutations (`get-tasks.ts`, `task-mutations.ts`) to handle nullable dates when reading, creating, and updating tasks/subtasks.
- [x] TASK-4: Update `src/features/tasks/components/task-form-dialog.tsx` to allow empty/cleared dates, remove required asterisk, and handle empty string inputs cleanly without false validation errors.
- [x] TASK-5: Update `src/features/gantt/components/gantt-chart.tsx` and `src/features/calendar/components/calendar-grid.tsx` to exclude tasks without start or due dates from timeline rendering.
- [x] TASK-6: Update `task-row.tsx` and `task-card.tsx` to safely format dates when null, rendering "Sin fecha" fallback.
- [x] TASK-7: Run `bun run lint` and `bun run build` to verify clean build and type safety.
- [x] TASK-8: Remove default `today` and `nextWeek` dates from inline task creation in `task-bucket-column.tsx` and set DatePicker placeholder to empty in `task-form-dialog.tsx`.

## Verification Evidence
- PostgreSQL migration `20260929235800_make_task_dates_optional` successfully applied.
- `bunx prisma generate` completed with 0 errors.
- `task-bucket-column.tsx` creates new tasks with `startDate: null` and `dueDate: null`.
- `task-form-dialog.tsx` renders clean empty fields when dates are unset (`placeholder=""`).
- `eslint` passed with 0 errors.
- `next build` compiled successfully in 4.5s with 0 TypeScript/build errors.
