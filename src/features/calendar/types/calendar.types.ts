import type { TaskDTO } from "@/features/tasks";

export type CalendarSubViewMode = "month" | "week" | "day" | "year";

export type CalendarViewMode =
  | CalendarSubViewMode
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
