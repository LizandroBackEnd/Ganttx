"use client";

import { useState, useMemo, useRef } from "react";
import { GanttHeader } from "./gantt-header";
import { GanttBar } from "./gantt-bar";
import { useGanttDrag } from "../hooks/use-gantt-drag";
import { TaskFormDialog, type ProjectMemberOption } from "@/features/tasks";
import type { TaskDTO } from "@/features/tasks";
import type { GanttDayColumn } from "../types/gantt.types";

export interface GanttChartProps {
  readonly projectId: string;
  readonly tasks: readonly TaskDTO[];
  readonly members?: readonly ProjectMemberOption[];
  readonly onTaskUpdated?: () => void;
}

const COLUMN_WIDTH_PX = 36;
const ROW_HEIGHT_PX = 42;

function formatDateToIsoString(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

export function GanttChart({
  projectId,
  tasks,
  members = [],
  onTaskUpdated,
}: GanttChartProps): React.JSX.Element {
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { dragState, startDrag } = useGanttDrag({
    columnWidthPx: COLUMN_WIDTH_PX,
    onDatesUpdated: onTaskUpdated,
  });

  // Calculate timeline date range
  const { columns, timelineStartIso } = useMemo(() => {
    let minDate = new Date();
    let maxDate = new Date();

    if (tasks.length > 0) {
      const startTimes = tasks.map((t) => new Date(`${t.startDate}T00:00:00.000Z`).getTime());
      const dueTimes = tasks.map((t) => new Date(`${t.dueDate}T00:00:00.000Z`).getTime());
      minDate = new Date(Math.min(...startTimes));
      maxDate = new Date(Math.max(...dueTimes));
    }

    // Add padding (7 days before min, 14 days after max)
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);

    const cols: GanttDayColumn[] = [];
    const curr = new Date(minDate);
    const todayIso = formatDateToIsoString(new Date());

    while (curr <= maxDate) {
      const dateString = formatDateToIsoString(curr);
      const dayOfWeek = curr.getDay(); // 0 is Sunday, 6 is Saturday
      const monthName = curr.toLocaleDateString(undefined, { month: "short", year: "numeric" });
      const dayName = curr.toLocaleDateString(undefined, { weekday: "short" });

      cols.push({
        date: new Date(curr),
        dateString,
        dayNumber: curr.getDate(),
        dayName,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: dateString === todayIso,
        monthName,
      });

      curr.setDate(curr.getDate() + 1);
    }

    return {
      columns: cols,
      timelineStartIso: cols[0]?.dateString ?? formatDateToIsoString(new Date()),
    };
  }, [tasks]);

  const timelineWidthPx = columns.length * COLUMN_WIDTH_PX;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
      {/* Chart container */}
      <div className="flex divide-x divide-border">
        {/* Left fixed sidebar */}
        <div className="w-60 shrink-0 flex flex-col bg-surface-elevated/30 z-20">
          <div className="h-16.25 border-b border-border flex items-center px-4 font-semibold text-xs text-text-secondary uppercase tracking-wider bg-surface-elevated/50">
            Task Title
          </div>

          <div className="flex flex-col divide-y divide-border/30">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedTask(task)}
                style={{ height: `${ROW_HEIGHT_PX}px` }}
                className="flex items-center justify-between px-4 text-left hover:bg-surface-elevated/60 transition-colors"
              >
                <span className="truncate text-xs font-medium text-text-primary">
                  {task.title}
                </span>
                <span className="text-[10px] font-mono text-text-muted shrink-0 ml-2">
                  {task.progress}%
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right scrollable timeline */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-surface/40"
        >
          <div style={{ width: `${timelineWidthPx}px` }} className="relative">
            {/* Timescale header */}
            <GanttHeader
              columns={columns}
              columnWidthPx={COLUMN_WIDTH_PX}
            />

            {/* Grid rows with bars */}
            <div className="relative flex flex-col divide-y divide-border/30">
              {/* Background vertical day grid lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {columns.map((col) => (
                  <div
                    key={`grid-${col.dateString}`}
                    style={{ width: `${COLUMN_WIDTH_PX}px` }}
                    className={`border-r border-border/20 h-full shrink-0 ${
                      col.isToday
                        ? "bg-primary/5 ring-1 ring-inset ring-primary/20"
                        : col.isWeekend
                        ? "bg-background/20"
                        : ""
                    }`}
                  />
                ))}
              </div>

              {/* Rows */}
              {tasks.map((task) => (
                <div
                  key={`row-${task.id}`}
                  style={{ height: `${ROW_HEIGHT_PX}px` }}
                  className="relative w-full hover:bg-surface-elevated/20 transition-colors"
                >
                  <GanttBar
                    task={task}
                    timelineStartIso={timelineStartIso}
                    columnWidthPx={COLUMN_WIDTH_PX}
                    dragState={dragState}
                    onStartDrag={startDrag}
                    onClick={() => setSelectedTask(task)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskFormDialog
          projectId={projectId}
          members={members}
          taskToEdit={selectedTask}
          isOpenControlled={Boolean(selectedTask)}
          onOpenChangeControlled={(open) => !open && setSelectedTask(null)}
        />
      )}
    </div>
  );
}
