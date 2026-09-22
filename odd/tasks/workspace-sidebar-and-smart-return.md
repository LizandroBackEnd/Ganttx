# Workspace Sidebar & Smart Navigation Return

## Objective
Refactor the project workspace navigation to introduce a left sidebar with 3 distinct sections (1. Tareas, 2. Calendario with grouped sub-modes, 3. Cronograma with Gantt chart), and make the back navigation button preserve the active view when returning from project settings.

## Problem Statement
The previous toolbar had all calendar sub-modes, tasks, and gantt in a flat horizontal list. Navigating to "Miembros y Ajustes" and clicking the back button lost the active view and navigated back to the project root instead of returning to the specific view (e.g. Gantt).

## Scope & Constraints
- Screaming Architecture: place components in `src/features/projects/components/` and export through barrel `src/features/projects/index.ts`.
- Pure Tailwind CSS v4 styling matching existing aesthetic.
- Fully typed with TypeScript (no `any`, no `!`, explicit return types).
- URL-driven state (`?view=tasks|calendar|gantt` & `?calView=month|week|day|year`).

## Tasks

- [x] `task-1`: Create `ProjectBackButton` component with smart back navigation logic.
- [x] `task-2`: Create `ProjectSidebar` component with Tareas, Calendario (with sub-modes), and Cronograma.
- [x] `task-3`: Refactor `ViewSwitcher` in `src/features/calendar/` to handle calendar sub-views (month, week, day, year).
- [x] `task-4`: Update `ProjectWorkspace` to integrate `ProjectSidebar`, layout in 2 columns (sidebar + content), and sync state with URL.
- [x] `task-5`: Update `ProjectNavTabs` and `src/app/(dashboard)/projects/[projectId]/layout.tsx` to integrate `ProjectBackButton`.
- [x] `task-6`: Verify full compilation and linting (`bun run lint`, `bun run build`).
