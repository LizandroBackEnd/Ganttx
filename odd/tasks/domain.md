# PR 4 — Projects & Tasks Domain Logic

## Status
Completed

## Tasks
- [x] Create `src/features/projects/types/project.types.ts` (DTOs & Zod schemas)
- [x] Create `src/features/projects/api/get-projects.ts` and `get-project-by-id.ts` (server-only data queries)
- [x] Create `src/features/projects/api/project-mutations.ts` (Server actions: create, update, delete, invite, remove)
- [x] Create `src/features/projects/components/` (card, create dialog, invite form, members table, settings form)
- [x] Create `src/features/projects/index.ts` (barrel export)
- [x] Create `src/features/tasks/types/task.types.ts` (DTOs & Zod schemas)
- [x] Create `src/features/tasks/api/get-tasks.ts` (server-only queries)
- [x] Create `src/features/tasks/api/task-mutations.ts` (Server actions: create, update, updateDates, updateStatus, delete)
- [x] Create `src/features/tasks/components/` (status badge, priority badge, task row, task table, task form dialog)
- [x] Create `src/features/tasks/index.ts` (barrel export)
- [x] Update `src/app/(dashboard)/layout.tsx` (Sidebar + top nav shell with navigation and user menu)
- [x] Update `src/app/(dashboard)/page.tsx` (Real project list dashboard with create project action)
- [x] Create `src/app/(dashboard)/projects/[projectId]/layout.tsx` (Project-scoped layout)
- [x] Create `src/app/(dashboard)/projects/[projectId]/page.tsx` (Project tasks view)
- [x] Create `src/app/(dashboard)/projects/[projectId]/loading.tsx` (Project skeleton)
- [x] Create `src/app/(dashboard)/projects/[projectId]/settings/page.tsx` (Project members and settings)
- [x] Verify: `npm run lint` and `npm run build`
