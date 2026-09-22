import type { TaskDTO } from "@/features/tasks";

export type CalendarViewMode =
  | "month"
  | "week"
  | "day"
  | "year"
  | "tasks"
  | "gantt";

export interface CalendarDayCell {
  readonly date: Date;
  readonly dateString: string; // YYYY-MM-DD
  readonly dayNumber: number;
  readonly isCurrentMonth: boolean;
  readonly isToday: boolean;
  readonly tasks: readonly TaskDTO[];
}
