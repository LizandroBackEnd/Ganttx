# Extended Task Model, EPICs & Dynamic Status/Priority Configuration

## Objective
Implement formal task structure with 9 explicit fields (ID/custom key, Actividad, Requerimiento, Sprint, Asignado, Duración en días, Inicio, Fin, Predecesoras), hierarchical EPIC/Master tasks, configurable statuses and priorities per project with dedicated settings modal, and remove manual progress slider.

## Scope & Constraints
- Screaming Architecture: domain logic in `src/features/tasks/`, persistence through `@/lib/prisma`.
- Type-safe DTO boundaries between database and React components.
- Tailwind CSS v4 styling matching premium dark aesthetic.
- Zero TypeScript `any` or `!` assertions.

## Tasks

- [ ] `task-1`: Update Prisma schema in `prisma/schema.prisma` and execute database migration.
- [ ] `task-2`: Update Task TypeScript DTOs, interfaces, and Server Action mutations with Zod validation.
- [ ] `task-3`: Create `TaskStatusPriorityConfigDialog` for custom status & priority management.
- [ ] `task-4`: Refactor `TaskFormDialog` with the 9 structured fields, EPIC toggle/parent selection, auto duration, and settings trigger.
- [ ] `task-5`: Refactor `TaskTable` and `TaskRow` to render the 9 fields, EPIC badges, and dynamic status/priority pills.
- [ ] `task-6`: Update `GanttChart` and `CalendarGrid` to support EPIC styling, task custom IDs, and dynamic colors.
- [ ] `task-7`: Run linting and production build verification (`bun run lint`, `bun run build`).
