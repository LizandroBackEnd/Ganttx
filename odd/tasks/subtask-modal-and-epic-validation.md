# Feature: Subtask Modal and Epic Validation

## Objective
Enhance subtask management in the task modal (`TaskFormDialog`):
1. Inline addition of subtasks: allow adding via typing + Enter, remove the X (cancel) button.
2. Replace action buttons in the add row with a representative icon (`IconExternalLink`) to open the subtask details in a full task modal.
3. Enable opening existing subtasks in the full task modal via the representative icon and clickable title.
4. Add validation and disabled UI state preventing subtasks from being marked as EPIC, showing parent info and feedback.

## Constraints & Requirements
- Screaming Architecture compliance (`src/features/tasks/`).
- TypeScript strict typing, no `any`, no `!`.
- Both client-side (Zod + disabled switch) and server-side (mutations) validation preventing subtasks from being marked as EPIC (`!(parentId && isEpic)`).
- Conventional commits with feature scope (`feat(tasks)`).

## Tasks
- [x] TASK-1: Backend Zod schema refinement and server actions in `src/features/tasks/types/task.types.ts` and `src/features/tasks/api/task-mutations.ts`.
- [x] TASK-2: Subtask inline creation refinement (Enter to add, remove X button, replace action icons with `IconExternalLink`).
- [x] TASK-3: Subtask modal integration (open existing subtasks and new subtasks in `TaskFormDialog`, refresh on close/update).
- [x] TASK-4: Subtask EPIC option disabling and parent info UI in `TaskFormDialog`.
- [x] TASK-5: Verification with `bun run lint` and `bun run build`.

## Verification Evidence
- `bun run lint` (ESLint) completed with 0 errors and 0 warnings.
- `bun run build` (Next.js 16.3.5 Turbopack compilation & TypeScript check) passed cleanly.
- `createTaskSchema` and `updateTaskSchema` refine and reject `parentId && isEpic`.
- `updateTask` server action validates that a subtask cannot have `isEpic: true`.
- `getTaskDetails` server action allows retrieving complete `TaskDTO` for any subtask.
- Subtask inline add row accepts title + Enter to create, removed the cancel X, and replaced Check/X with `IconExternalLink`.
- Existing subtasks list rows allow clicking the title or the `IconExternalLink` action button to open the subtask in `TaskFormDialog`.
- When subtask modal is open (`isSubtask={true}`), the EPIC toggle switch is disabled, displays a helper badge, and shows the parent task it belongs to.
