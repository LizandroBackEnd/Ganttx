# Empty State Initial Buckets and Onboarding

## Problem & Objective
When creating a new project, users expect a clean slate without pre-populated buckets. However, in Kanban systems, tasks cannot exist without a bucket (lifecycle state). The objective is to:
1. Allow new projects to start with 0 buckets (empty array).
2. Present a dedicated, high-aesthetic Empty State onboarding the user to create their first bucket/column.
3. Block the "Nueva Tarea" action while 0 buckets exist, preventing orphaned/invisible tasks.
4. Support loading standard preset columns on demand as an optional shortcut.

## Scope & Constraints
- Screaming Architecture compliance: domain logic remains inside `src/features/tasks/` and `src/features/projects/`.
- No dynamic CSS class construction; use Tailwind tokens and CVA/cn patterns.
- TypeScript `strict: true`, no `any`, no `!`.

## Tasks
- [x] Task 1: Update domain bucket defaults in `src/features/tasks/types/task.types.ts` and `src/features/projects/api/project-mutations.ts` so new projects start with 0 buckets.
- [x] Task 2: Implement Kanban board empty state, disable "Nueva Tarea" when buckets is empty, and allow deleting the last bucket in `src/features/tasks/components/task-board.tsx`.
- [x] Task 3: Update `src/features/tasks/components/task-table.tsx` and `src/features/tasks/components/task-form-dialog.tsx` to handle 0-bucket projects cleanly.
- [x] Task 4: Verify with `bun run lint` and `bun run build`.
