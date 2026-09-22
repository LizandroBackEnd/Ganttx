import type { TaskDTO } from "@/features/tasks";

export interface GanttTimelineRange {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly totalDays: number;
}

export interface GanttDayColumn {
  readonly date: Date;
  readonly dateString: string;
  readonly dayNumber: number;
  readonly dayName: string;
  readonly isWeekend: boolean;
  readonly isToday: boolean;
  readonly monthName: string;
}

export interface GanttBarPosition {
  readonly leftPx: number;
  readonly widthPx: number;
  readonly task: TaskDTO;
}

export type GanttDragMode = "move" | "resize-start" | "resize-end";

export interface GanttDragState {
  readonly taskId: string;
  readonly mode: GanttDragMode;
  readonly initialClientX: number;
  readonly currentDeltaDays: number;
  readonly originalStartDate: string;
  readonly originalDueDate: string;
}
