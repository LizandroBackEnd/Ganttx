"use client";

import { useMemo } from "react";
import { IconCrown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  getTaskBucketId,
  getBucketColor,
  getProjectBuckets,
  isTaskDone,
  parseTaskLabels,
  type TaskDTO,
  type CustomStatusOption,
  type CustomPriorityOption,
} from "@/features/tasks";
import { TASK_PRIORITY_LABELS, type TaskPriority } from "@/lib/constants";
import type { GanttDragMode, GanttDragState } from "../types/gantt.types";

export interface GanttBarProps {
  readonly task: TaskDTO & { readonly startDate: string; readonly dueDate: string };
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
  readonly customStatuses?: readonly CustomStatusOption[] | null;
  readonly customPriorities?: readonly CustomPriorityOption[] | null;
}

function getDayDiff(startDateIso: string, targetDateIso: string): number {
  const d1 = new Date(`${startDateIso}T00:00:00.000Z`).getTime();
  const d2 = new Date(`${targetDateIso}T00:00:00.000Z`).getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

interface BarPalette {
  bg: string;
  fill: string;
  glow: string;
  handle: string;
}

const EPIC_PALETTE: BarPalette = {
  bg: "bg-gradient-to-r from-purple-500/25 via-indigo-500/30 to-purple-500/35 border-purple-500/60 hover:border-purple-400 ring-1 ring-purple-500/30",
  fill: "bg-gradient-to-r from-purple-500/50 to-indigo-400/60",
  glow: "hover:shadow-[0_0_18px_rgba(168,85,247,0.35)]",
  handle: "bg-purple-400",
};

const RANDOM_PALETTES: readonly BarPalette[] = [
  // 1. Emerald / Teal
  {
    bg: "bg-gradient-to-r from-emerald-500/20 via-teal-500/25 to-emerald-500/30 border-emerald-500/50 hover:border-emerald-400",
    fill: "bg-gradient-to-r from-emerald-500/40 to-teal-400/50",
    glow: "hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]",
    handle: "bg-emerald-400",
  },
  // 2. Sky / Blue
  {
    bg: "bg-gradient-to-r from-sky-500/20 via-blue-500/25 to-sky-500/30 border-sky-500/50 hover:border-sky-400",
    fill: "bg-gradient-to-r from-sky-500/40 to-blue-400/50",
    glow: "hover:shadow-[0_0_15px_rgba(14,165,233,0.25)]",
    handle: "bg-sky-400",
  },
  // 3. Amber / Orange
  {
    bg: "bg-gradient-to-r from-amber-500/20 via-orange-500/25 to-amber-500/30 border-amber-500/50 hover:border-amber-400",
    fill: "bg-gradient-to-r from-amber-500/40 to-orange-400/50",
    glow: "hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]",
    handle: "bg-amber-400",
  },
  // 4. Rose / Red
  {
    bg: "bg-gradient-to-r from-rose-500/20 via-red-500/25 to-rose-500/30 border-rose-500/50 hover:border-rose-400",
    fill: "bg-gradient-to-r from-rose-500/40 to-red-400/50",
    glow: "hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]",
    handle: "bg-rose-400",
  },
  // 5. Indigo / Violet
  {
    bg: "bg-gradient-to-r from-indigo-500/20 via-violet-500/25 to-indigo-500/30 border-indigo-500/50 hover:border-indigo-400",
    fill: "bg-gradient-to-r from-indigo-500/40 to-violet-400/50",
    glow: "hover:shadow-[0_0_15px_rgba(99,102,241,0.25)]",
    handle: "bg-indigo-400",
  },
  // 6. Fuchsia / Pink
  {
    bg: "bg-gradient-to-r from-fuchsia-500/20 via-pink-500/25 to-fuchsia-500/30 border-fuchsia-500/50 hover:border-fuchsia-400",
    fill: "bg-gradient-to-r from-fuchsia-500/40 to-pink-400/50",
    glow: "hover:shadow-[0_0_15px_rgba(217,70,239,0.25)]",
    handle: "bg-fuchsia-400",
  },
  // 7. Lime / Green
  {
    bg: "bg-gradient-to-r from-lime-500/20 via-emerald-500/25 to-lime-500/30 border-lime-500/50 hover:border-lime-400",
    fill: "bg-gradient-to-r from-lime-500/40 to-emerald-400/50",
    glow: "hover:shadow-[0_0_15px_rgba(132,204,22,0.25)]",
    handle: "bg-lime-400",
  },
  // 8. Cyan / Blue
  {
    bg: "bg-gradient-to-r from-cyan-500/20 via-blue-500/25 to-cyan-500/30 border-cyan-500/50 hover:border-cyan-400",
    fill: "bg-gradient-to-r from-cyan-500/40 to-blue-400/50",
    glow: "hover:shadow-[0_0_15px_rgba(6,182,212,0.25)]",
    handle: "bg-cyan-400",
  },
];

function getTaskPalette(taskId: string): BarPalette {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = (hash << 5) - hash + taskId.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % RANDOM_PALETTES.length;
  return RANDOM_PALETTES[idx] ?? RANDOM_PALETTES[0];
}

export function GanttBar({
  task,
  timelineStartIso,
  columnWidthPx,
  dragState,
  onStartDrag,
  onClick,
  customStatuses,
  customPriorities,
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
      return EPIC_PALETTE;
    }
    return getTaskPalette(task.id);
  }, [task.isEpic, task.id]);

  const bucketId = getTaskBucketId(task.bucket);
  const buckets = useMemo(() => getProjectBuckets(customStatuses), [customStatuses]);
  const bucketOption = useMemo(() => {
    return buckets.find((b) => b.id.toUpperCase() === bucketId.toUpperCase());
  }, [buckets, bucketId]);

  const bucketLabel = bucketOption?.label ?? bucketId;
  const bucketColor = bucketOption?.color ?? getBucketColor(bucketId);

  return (
    <div
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
      }}
      className={`group absolute top-1/2 -translate-y-1/2 h-7 rounded-md border text-xs select-none transition-all cursor-grab active:cursor-grabbing backdrop-blur-xs ${
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
          <span className={cn("truncate", isTaskDone(task.bucket) && "line-through opacity-70")}>
            {task.title}
          </span>
        </div>
        {/* Label (priority/custom labels) badge(s) + bucket (status) badge */}
        <div className="flex items-center gap-1 ml-1.5 shrink-0">
          {/* Priority / Custom labels */}
          {parseTaskLabels(task.label).map((lblId) => {
            const custom = customPriorities?.find(
              (p) => p.id === lblId || p.label.toUpperCase() === lblId.toUpperCase()
            );
            const displayLabel =
              custom?.label ?? TASK_PRIORITY_LABELS[lblId as TaskPriority] ?? lblId;
            const color = custom?.color;

            return (
              <span
                key={lblId}
                style={
                  color
                    ? {
                        backgroundColor: `${color}25`,
                        borderColor: `${color}50`,
                        color: color,
                      }
                    : undefined
                }
                className={cn(
                  "inline-flex items-center rounded border px-1 py-0 text-[9px] font-semibold leading-4 shrink-0 font-mono uppercase tracking-wider",
                  !color && "bg-white/10 border-white/20 text-text-primary/90"
                )}
              >
                {displayLabel}
              </span>
            );
          })}
          {/* Bucket / status */}
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0 text-[9px] font-semibold bg-black/30 text-text-primary/90 leading-4">
            <span
              className="inline-block size-1.5 rounded-full shrink-0"
              style={{ backgroundColor: bucketColor }}
            />
            {bucketLabel}
          </span>
        </div>
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
