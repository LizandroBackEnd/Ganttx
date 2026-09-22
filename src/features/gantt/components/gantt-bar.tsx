"use client";

import { useMemo } from "react";
import type { TaskDTO } from "@/features/tasks";
import type { GanttDragMode, GanttDragState } from "../types/gantt.types";

export interface GanttBarProps {
  readonly task: TaskDTO;
  readonly timelineStartIso: string;
  readonly columnWidthPx: number;
  readonly dragState: GanttDragState | null;
  readonly onStartDrag: (
    taskId: string,
    mode: GanttDragMode,
    clientX: number,
    start: string,
    due: string
  ) => void;
  readonly onClick?: () => void;
}

function getDayDiff(startDateIso: string, targetDateIso: string): number {
  const d1 = new Date(`${startDateIso}T00:00:00.000Z`).getTime();
  const d2 = new Date(`${targetDateIso}T00:00:00.000Z`).getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function GanttBar({
  task,
  timelineStartIso,
  columnWidthPx,
  dragState,
  onStartDrag,
  onClick,
}: GanttBarProps): React.JSX.Element {
  const isCurrentlyDragging = dragState?.taskId === task.id;

  const { leftPx, widthPx } = useMemo(() => {
    const startIso = task.startDate;
    const dueIso = task.dueDate;

    if (isCurrentlyDragging && dragState) {
      // preview drag position
      if (dragState.mode === "move") {
        const offset = dragState.currentDeltaDays * columnWidthPx;
        const baseLeft = getDayDiff(timelineStartIso, startIso) * columnWidthPx;
        const durationDays = getDayDiff(startIso, dueIso) + 1;
        return {
          leftPx: Math.max(0, baseLeft + offset),
          widthPx: Math.max(columnWidthPx, durationDays * columnWidthPx),
        };
      }
      if (dragState.mode === "resize-start") {
        const offset = dragState.currentDeltaDays * columnWidthPx;
        const baseLeft = getDayDiff(timelineStartIso, startIso) * columnWidthPx;
        const durationDays = getDayDiff(startIso, dueIso) + 1;
        const newLeft = baseLeft + offset;
        const newWidth = durationDays * columnWidthPx - offset;
        return {
          leftPx: Math.max(0, newLeft),
          widthPx: Math.max(columnWidthPx, newWidth),
        };
      }
      if (dragState.mode === "resize-end") {
        const offset = dragState.currentDeltaDays * columnWidthPx;
        const baseLeft = getDayDiff(timelineStartIso, startIso) * columnWidthPx;
        const durationDays = getDayDiff(startIso, dueIso) + 1;
        return {
          leftPx: baseLeft,
          widthPx: Math.max(columnWidthPx, durationDays * columnWidthPx + offset),
        };
      }
    }

    const startOffsetDays = getDayDiff(timelineStartIso, startIso);
    const durationDays = Math.max(1, getDayDiff(startIso, dueIso) + 1);

    return {
      leftPx: startOffsetDays * columnWidthPx,
      widthPx: durationDays * columnWidthPx,
    };
  }, [task, timelineStartIso, columnWidthPx, isCurrentlyDragging, dragState]);

  return (
    <div
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
      }}
      className={`group absolute top-1.5 h-7 rounded-md border text-xs select-none transition-shadow cursor-grab active:cursor-grabbing ${
        isCurrentlyDragging
          ? "border-primary bg-primary/30 shadow-lg ring-2 ring-primary/40 z-30"
          : "border-primary/40 bg-surface-elevated hover:border-primary hover:bg-surface-elevated/90 hover:shadow-md z-10"
      }`}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).dataset.handle) return;
        onStartDrag(task.id, "move", e.clientX, task.startDate, task.dueDate);
      }}
      onClick={() => {
        if (!isCurrentlyDragging) {
          onClick?.();
        }
      }}
    >
      {/* Progress fill */}
      <div
        style={{ width: `${task.progress}%` }}
        className="absolute inset-y-0 left-0 rounded-l-md bg-primary/40 transition-all pointer-events-none"
      />

      {/* Resize Left Handle */}
      <div
        data-handle="start"
        onMouseDown={(e) => {
          e.stopPropagation();
          onStartDrag(task.id, "resize-start", e.clientX, task.startDate, task.dueDate);
        }}
        className="absolute -left-1 top-0 bottom-0 w-2.5 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center"
      >
        <div className="w-1 h-3 rounded-full bg-primary" />
      </div>

      {/* Label */}
      <div className="relative z-10 flex h-full items-center justify-between px-2 text-[11px] font-medium text-text-primary truncate pointer-events-none">
        <span className="truncate">{task.title}</span>
        <span className="font-mono text-[10px] text-text-muted ml-1 shrink-0">
          {task.progress}%
        </span>
      </div>

      {/* Resize Right Handle */}
      <div
        data-handle="end"
        onMouseDown={(e) => {
          e.stopPropagation();
          onStartDrag(task.id, "resize-end", e.clientX, task.startDate, task.dueDate);
        }}
        className="absolute -right-1 top-0 bottom-0 w-2.5 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center"
      >
        <div className="w-1 h-3 rounded-full bg-primary" />
      </div>
    </div>
  );
}
