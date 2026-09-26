# Navbar Calendar & Dark/Light Mode Integration

## Objective
Reorder the project navigation to place "Calendario" as the primary option (above "Tareas" and "Cronograma") in the project sidebar, make calendar the default view when no view is specified, and implement a full dark/light theme switching system with a theme toggle button positioned directly next to the user menu in the dashboard navbar.

## Problem Statement
1. The project sidebar previously placed "Tareas" in the first position, whereas the user requested "Calendario" in first place as the primary navigation option.
2. The application currently supports only a hardcoded dark theme in `globals.css` with no mechanism to switch between dark and light themes, and no toggle button next to the user icon.

## Scope & Constraints
- Screaming Architecture: Domain-agnostic UI (`ThemeToggle`, `ThemeProvider`) placed in `src/shared/`.
- Project sidebar changes remain inside `src/features/projects/components/project-sidebar.tsx`.
- Pure Tailwind CSS v4 variables with seamless transitions between dark and light modes.
- No `any`, no `!`, explicit return types on all functions and components.
- Persistent theme state (localStorage with system fallback and zero-flash inline head script).
- Strict verification via `bun run lint` and `bun run build`.

## Tasks

- [x] `task-1`: Reorder project navigation in `ProjectSidebar` so "Calendario" is the 1st option (with expandable sub-modes: Mes, Semana, Día, Año), followed by "Tareas" and "Cronograma", and set "calendar" as default view in `ProjectWorkspace`.
- [x] `task-2`: Configure CSS theme tokens in `src/app/globals.css` to define both light mode (`:root`) and dark mode (`.dark`) color schemes supporting all Ganttx design tokens (`--background`, `--surface`, `--surface-elevated`, `--border`, `--text-primary`, `--text-secondary`, etc.).
- [x] `task-3`: Implement client-side `ThemeProvider` and `ThemeToggle` components in `src/shared/` with local persistence, system preference detection, and FOUC prevention.
- [x] `task-4`: Mount `ThemeProvider` in `src/app/layout.tsx` and place `ThemeToggle` directly next to `UserMenu` in `src/app/(dashboard)/layout.tsx`.
- [x] `task-5`: Verify visual fidelity, color contrast, and run `bun run lint` and `bun run build`.
