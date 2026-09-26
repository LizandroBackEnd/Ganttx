# Task Buckets Board & Drag-and-Drop Refactor

## Objective
Refactor the tasks view (`primaryView === "tasks"`) into an interactive Kanban Bucket Board matching the Ganttx design system, allowing users to create custom buckets, see tasks organized by bucket column, drag and drop tasks between buckets with optimistic updates, and quickly add tasks directly to specific buckets.

## Problem Statement
The current task view is a static table with pre-filtered horizontal tabs ("Todas", "Por Hacer", etc.). The user wants a flexible bucket board (as seen in agile sprint boards / Kanban) where buckets can be dynamically created and tasks can be dragged and dropped from one bucket to another.

## Scope & Constraints
- Screaming Architecture: place components in `src/features/tasks/components/` and export through `src/features/tasks/index.ts`.
- Pure Tailwind CSS v4 styling matching both light and dark themes.
- Native HTML5 Drag and Drop API (zero external drag dependencies).
- Optimistic UI updates with server action persistence (`updateTaskStatus` & `updateProjectCustomOptions`).
- Fast and accessible keyboard and mouse interactions.
- Strict type-safety: no `any`, no `!`, explicit return types.
- Verification via `bun run lint` and `bun run build`.

## Tasks

- [x] `task-1`: Define bucket types and default bucket configurations (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) with helpers to normalize custom statuses.
- [x] `task-2`: Create `TaskCard` draggable component with Ganttx dark/light styling, priority badges, tags, assignees, and edit triggers.
- [x] `task-3`: Create `TaskBucketColumn` with drop-zone detection, header indicators, task counts, quick "+" task creation in column, and bucket actions.
- [x] `task-4`: Implement `TaskBoard` (Kanban Buckets View) with HTML5 drag-and-drop state, optimistic status updates, "+ Nuevo Bucket" dialog, and search filtering.
- [x] `task-5`: Integrate `TaskBoard` as default view in `ProjectWorkspace` with toggle for Table view, and update feature barrel exports.
- [x] `task-6`: Verify with `bun run lint` and `bun run build`.
