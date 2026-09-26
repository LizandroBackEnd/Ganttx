# Feature: Subtask Modal and Epic Validation

## Objective
Enhance subtask management in the task modal (`TaskFormDialog`):
1. Inline addition of subtasks: allow adding via typing + Enter, remove the X (cancel) button.
2. Replace action buttons in the add row with a representative icon (`IconExternalLink`) to open the subtask details in a full task modal.
3. Enable opening existing subtasks in the full task modal via the representative icon and clickable title.
4. In subtask modal, completely remove the EPIC section and only display which parent task it belongs to.
5. Ensure all other task actions, buttons, and fields work identically to a normal task.
6. Subtask start and due date range validation: a subtask cannot start before its parent task/epic (`subtask.startDate >= parent.startDate`) nor finish after its parent task/epic (`subtask.dueDate <= parent.dueDate`). The full date range of the subtask must be strictly within the parent's boundaries.
7. Subtask custom label/etiqueta support: subtasks can have their own independent label (e.g., P1, P2, P3, P4), functioning identically to a standard task, displaying in subtask list and inline creation row.
8. Enable seamless interactive editing of Asignado, Etiquetas, and DatePickers in the subtask modal by resolving nested modal z-index layering (`z-100` for Select and Popover portals).

## Constraints & Requirements
- Screaming Architecture compliance (`src/features/tasks/`).
- TypeScript strict typing, no `any`, no `!`.
- Client-side (`DatePicker minDate` & `maxDate`, validation alert) and server-side (`createTask`, `updateTask`, `updateTaskDates`) validation preventing subtask date ranges from falling outside the parent task's date range.
- Portal z-index hierarchy (`z-100` for `SelectContent` and `PopoverContent`, `z-55` for subtask `DialogOverlay`) so dropdowns and pickers always sit on top and remain interactive.
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
- [x] TASK-9: Subtask due date validation against parent task/epic (`dueDate <= parent.dueDate`) in UI (DatePicker maxDate) and backend (`createTask`, `updateTask`, `updateTaskDates`).
- [x] TASK-10: Fix portal z-index layering for `SelectContent` (`z-100`) and `PopoverContent` (`z-100`), ensuring Asignado, Etiquetas, and DatePicker dropdowns can be clicked and edited within the subtask modal.
- [x] TASK-11: Multi-label support on tasks and subtasks with TaskCard badge row rendering and subtask label isolation:
  - Created `TaskLabelSelector` multi-select popover with pill badges and quick removal.
  - Updated `TaskPriorityBadge` to parse comma-separated labels and render all badges side-by-side.
  - Enabled multi-label selection in `TaskFormDialog` for main tasks and subtasks (both modal and inline creation row).
  - Main task labels rendered on `TaskCard` next to EPIC badge.
  - Subtask labels strictly isolated from `TaskCard`, appearing only in their own view (subtask list and subtask modal).
  - Updated `TaskBoard` priority filter to support multi-label tasks.
- [x] TASK-12: Subtask completion flow, main task auto-completion, round check with subtask prompt, completed subtask hiding, and progress bar:
  - Added completion checkbox in `TaskFormDialog` subtasks table.
  - Implemented auto-completion of parent task when all subtasks become completed (`bucket: "DONE"`).
  - Added hover round check on `TaskCard` with interactive Sileo action toast (`CompleteTaskConfirmToast`) to prompt completing pending subtasks, direct completion if none, and notifications.
  - Filtered completed subtasks out of the `TaskCard` checklist so only pending items appear.
  - Added subtasks progress bar on `TaskCard` when `showSubtasksOnCard` is false.
  - Fixed subtask sync bug on `TaskCard` using derived `subtaskOverrides` pattern and instant mutation callback notifications.

## Verification Evidence
- `bun run lint` (ESLint) completed with 0 errors and 0 warnings.
- `bun run build` (Next.js 16.3.5 Turbopack compilation & TypeScript check) passed cleanly.
- `createTaskSchema` and `updateTaskSchema` refine and reject `parentId && isEpic`.
- `updateTask` server action validates that a subtask cannot have `isEpic: true`.
- `getTaskDetails` server action allows retrieving complete `TaskDTO` for any subtask with parent's `startDate`, `dueDate`, and subtasks' `label`.
- Subtask inline add row accepts title + Enter to create, removed the cancel X, and replaced Check/X with `IconExternalLink`.
- Subtask inline add row includes label/etiqueta selector defaulting to parent task's priority or project default.
- Subtasks list displays `TaskPriorityBadge` for each subtask with its own custom label/etiqueta.
- Subtask modal (`isSubtask={true}`) features the identical "Etiquetas" field as standard tasks, allowing custom label selection.
- Subtask modal date pickers enforce `minDate={parentStartDate}` and `maxDate={parentDueDate}`, restricting dates strictly within the parent range.
- Backend mutations (`createTask`, `updateTask`, `updateTaskDates`) enforce `subtask.startDate >= parent.startDate` AND `subtask.dueDate <= parent.dueDate`.
- `SelectContent` and `PopoverContent` use `z-100` so Assignee and Label dropdowns and DatePickers appear above the subtask modal (`z-60`) and are fully interactive.
- Subtask dialog overlay uses `z-55` to layer properly over the parent modal (`z-50`).
- `TaskPriorityBadge` splits comma-separated labels (e.g. `P3,P2,P1`) and renders discrete colored badges for each label.
- `TaskCard` renders all assigned labels of the main task in the badge row (`[P3] [P2] [P1] [EPIC]`).
- `TaskCard` checklist items display only completion status, subtask title, and assignee avatar; subtask labels never appear on the parent task card.
- `TaskLabelSelector` enables toggling multiple labels with checkmarks, responsive pills with `x` remove buttons, and inline customize action.
- Round check button on `TaskCard` hover allows toggling main task completion and displays an interactive Sileo toast asking to complete pending subtasks if any exist.
- Completed subtasks are hidden from `TaskCard` checklist while total/completed counter remains accurate.
- When `showSubtasksOnCard` is false, `TaskCard` displays a progress bar of completed subtasks.
- In `TaskFormDialog`, each subtask has a completion check, and completing the last pending subtask automatically completes the parent task.
