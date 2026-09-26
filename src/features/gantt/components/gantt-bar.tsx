"use client";

import { useMemo } from "react";
import { IconCrown, IconDiamond } from "@tabler/icons-react";
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

  const priorityGradient = useMemo(() => {
    if (task.isEpic) {
      return {
        bg: "bg-gradient-to-r from-purple-500/25 via-indigo-500/30 to-purple-500/35 border-purple-500/60 hover:border-purple-400 ring-1 ring-purple-500/30",
        fill: "bg-gradient-to-r from-purple-500/50 to-indigo-400/60",
        glow: "hover:shadow-[0_0_18px_rgba(168,85,247,0.35)]",
        handle: "bg-purple-400",
      };
    }

    switch (task.priority) {
      case "LOW":
        return {
          bg: "bg-gradient-to-r from-emerald-500/15 via-teal-500/20 to-emerald-500/25 border-emerald-500/40 hover:border-emerald-400",
          fill: "bg-gradient-to-r from-emerald-500/40 to-teal-400/50",
          glow: "hover:shadow-[0_0_15px_rgba(0,242,142,0.25)]",
          handle: "bg-emerald-400",
        };
      case "MEDIUM":
        return {
          bg: "bg-gradient-to-r from-sky-500/15 via-blue-500/20 to-sky-500/25 border-sky-500/40 hover:border-sky-400",
          fill: "bg-gradient-to-r from-sky-500/40 to-blue-400/50",
          glow: "hover:shadow-[0_0_15px_rgba(14,165,233,0.25)]",
          handle: "bg-sky-400",
        };
      case "HIGH":
        return {
          bg: "bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-amber-500/25 border-amber-500/40 hover:border-amber-400",
          fill: "bg-gradient-to-r from-amber-500/40 to-orange-400/50",
          glow: "hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]",
          handle: "bg-amber-400",
        };
      case "URGENT":
      default:
        return {
          bg: "bg-gradient-to-r from-rose-500/20 via-red-500/25 to-rose-500/30 border-rose-500/50 hover:border-rose-400",
          fill: "bg-gradient-to-r from-rose-500/50 to-red-400/60",
          glow: "hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]",
          handle: "bg-rose-400",
        };
    }
  }, [task.isEpic, task.priority]);

  return (
    <div
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
      }}
      className={`group absolute top-1.5 h-7 rounded-md border text-xs select-none transition-all cursor-grab active:cursor-grabbing backdrop-blur-xs ${
        isCurrentlyDragging
          ? "border-primary bg-primary/30 shadow-lg ring-2 ring-primary/40 z-30"
          : `${priorityGradient.bg} ${priorityGradient.glow} z-10`
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
      {/* Resize Left Handle */}
      <div
        data-handle="start"
        onMouseDown={(e) => {
          e.stopPropagation();
          onStartDrag(task.id, "resize-start", e.clientX, task.startDate, task.dueDate);
        }}
        className="absolute -left-1 top-0 bottom-0 w-2.5 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center"
      >
        <div className={`w-1 h-3 rounded-full ${priorityGradient.handle}`} />
      </div>

      {/* Label */}
      <div className="relative z-10 flex h-full items-center justify-between px-2 text-[11px] font-medium text-text-primary truncate pointer-events-none">
        <div className="flex items-center gap-1 truncate min-w-0">
          {task.isEpic && (
            <IconCrown className="size-3 text-purple-300 shrink-0" />
          )}
          {task.isMilestone && (
            <IconDiamond className="size-3 text-amber-300 shrink-0" />
          )}
          <span className="truncate">{task.title}</span>
        </div>
        <span className="font-mono text-[10px] text-text-muted ml-1 shrink-0">
          {task.status}
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
        <div className={`w-1 h-3 rounded-full ${priorityGradient.handle}`} />
      </div>
    </div>
  );
}
