# Feature: Subtask Modal and Epic Validation

## Objective
Enhance subtask management in the task modal (`TaskFormDialog`):
1. Inline addition of subtasks: allow adding via typing + Enter, remove the X (cancel) button.
2. Replace action buttons in the add row with a representative icon (`IconExternalLink`) to open the subtask details in a full task modal.
3. Enable opening existing subtasks in the full task modal via the representative icon and clickable title.
4. In subtask modal, completely remove the EPIC section and only display which parent task it belongs to.
5. Ensure all other task actions, buttons, and fields work identically to a normal task.
6. Subtask start date validation: a subtask cannot start before its parent task/epic (`subtask.startDate >= parent.startDate`). Same-day start is allowed.
7. Subtask custom label/etiqueta support: subtasks can have their own independent label (e.g., P1, P2, P3, P4), functioning identically to a standard task, displaying in subtask list and inline creation row.

## Constraints & Requirements
- Screaming Architecture compliance (`src/features/tasks/`).
- TypeScript strict typing, no `any`, no `!`.
- Client-side (`DatePicker minDate`, validation alert) and server-side (`createTask`, `updateTask`, `updateTaskDates`) validation preventing subtask start dates earlier than parent start dates.
- Subtask custom label support in `SubtaskDTO`, `createSubtask`, `getSubtasks`, `getTaskDetails`, `TaskFormDialog`, and `TaskPriorityBadge`.
- Conventional commits with feature scope (`feat(tasks)`).

## Tasks
- [x] TASK-1: Backend Zod schema refinement and server actions in `src/features/tasks/types/task.types.ts` and `src/features/tasks/api/task-mutations.ts`.
- [x] TASK-2: Subtask inline creation refinement (Enter to add, remove X button, replace action icons with `IconExternalLink`).
- [x] TASK-3: Subtask modal integration (open existing subtasks and new subtasks in `TaskFormDialog`, refresh on close/update).
- [x] TASK-4: Subtask EPIC option disabling and parent info UI in `TaskFormDialog`.
- [x] TASK-5: Verification with `bun run lint` and `bun run build`.
- [x] TASK-6: Completely remove EPIC section in subtask modal, displaying only the parent task reference.
- [x] TASK-7: Subtask start date validation against parent task/epic (`startDate >= parent.startDate`) in UI (DatePicker minDate) and backend (`createTask`, `updateTask`, `updateTaskDates`).
- [x] TASK-8: Subtask independent label/etiqueta support with selection dropdown in inline row, badge in subtasks list, and synchronization in subtask modal.

## Verification Evidence
- `bun run lint` (ESLint) completed with 0 errors and 0 warnings.
- `bun run build` (Next.js 16.3.5 Turbopack compilation & TypeScript check) passed cleanly.
- `createTaskSchema` and `updateTaskSchema` refine and reject `parentId && isEpic`.
- `updateTask` server action validates that a subtask cannot have `isEpic: true`.
- `getTaskDetails` server action allows retrieving complete `TaskDTO` for any subtask with parent's `startDate` and subtasks' `label`.
- Subtask inline add row accepts title + Enter to create, removed the cancel X, and replaced Check/X with `IconExternalLink`.
- Subtask inline add row includes label/etiqueta selector defaulting to parent task's priority or project default.
- Subtasks list displays `TaskPriorityBadge` for each subtask with its own custom label/etiqueta.
- Subtask modal (`isSubtask={true}`) features the identical "Etiquetas" field as standard tasks, allowing custom label selection.
- Subtask modal date picker enforces `minDate={parentStartDate}`, preventing dates earlier than the parent/epic start date while allowing same-day or later dates.
- Backend mutations (`createTask`, `updateTask`, `updateTaskDates`) enforce `subtask.startDate >= parent.startDate`.
- Auto-save in `TaskFormContent` calls `onTaskCreatedOrUpdated` on updates to notify the parent modal and immediately sync changes.
