"use client";

import { useState, useMemo } from "react";
import { TaskFormDialog, type ProjectMemberOption } from "@/features/tasks";
import type { TaskDTO } from "@/features/tasks";
import type { CalendarViewMode, CalendarDayCell } from "../types/calendar.types";

export interface CalendarGridProps {
  readonly currentDate: Date;
  readonly viewMode: CalendarViewMode;
  readonly tasks: readonly TaskDTO[];
  readonly projectId: string;
  readonly members?: readonly ProjectMemberOption[];
}

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDateToIsoString(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

export function CalendarGrid({
  currentDate,
  viewMode,
  tasks,
  projectId,
  members = [],
}: CalendarGridProps): React.JSX.Element {
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);
  const [createDate, setCreateDate] = useState<string | null>(null);

  // Month days generation
  const monthCells = useMemo<CalendarDayCell[]>(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
    const totalDays = lastDayOfMonth.getDate();

    const todayStr = formatDateToIsoString(new Date());
    const cells: CalendarDayCell[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const date = new Date(year, month - 1, dayNum);
      const dateString = formatDateToIsoString(date);
      const dayTasks = tasks.filter(
        (t) => t.startDate <= dateString && t.dueDate >= dateString
      );
      cells.push({
        date,
        dateString,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
        tasks: dayTasks,
      });
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const dateString = formatDateToIsoString(date);
      const dayTasks = tasks.filter(
        (t) => t.startDate <= dateString && t.dueDate >= dateString
      );
      cells.push({
        date,
        dateString,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateString === todayStr,
        tasks: dayTasks,
      });
    }

    // Next month padding to fill 35 or 42 cells
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      const dateString = formatDateToIsoString(date);
      const dayTasks = tasks.filter(
        (t) => t.startDate <= dateString && t.dueDate >= dateString
      );
      cells.push({
        date,
        dateString,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateString === todayStr,
        tasks: dayTasks,
      });
    }

    return cells;
  }, [currentDate, tasks]);

  // Week days generation
  const weekDays = useMemo<CalendarDayCell[]>(() => {
    const start = new Date(currentDate);
    const day = (start.getDay() + 6) % 7; // Monday = 0
    start.setDate(start.getDate() - day);

    const todayStr = formatDateToIsoString(new Date());
    const days: CalendarDayCell[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateString = formatDateToIsoString(date);
      const dayTasks = tasks.filter(
        (t) => t.startDate <= dateString && t.dueDate >= dateString
      );
      days.push({
        date,
        dateString,
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        isToday: dateString === todayStr,
        tasks: dayTasks,
      });
    }

    return days;
  }, [currentDate, tasks]);

  // Day view tasks
  const dayDateStr = formatDateToIsoString(currentDate);
  const dayTasks = useMemo(() => {
    return tasks.filter(
      (t) => t.startDate <= dayDateStr && t.dueDate >= dayDateStr
    );
  }, [tasks, dayDateStr]);

  if (viewMode === "day") {
    return (
      <div className="flex flex-col rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              Scheduled for this day
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">
              {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"} active
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateDate(dayDateStr)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            + Add Task for Today
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {dayTasks.length > 0 ? (
            dayTasks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTask(t)}
                className="flex items-center justify-between rounded-lg border border-border/80 bg-surface-elevated/40 p-3 text-left hover:border-primary/40 hover:bg-surface-elevated transition-colors"
              >
                <div>
                  <h5 className="text-sm font-medium text-text-primary">{t.title}</h5>
                  {t.description && (
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{t.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-primary">{t.progress}%</span>
                  <span className="rounded bg-surface px-2 py-0.5 font-mono text-[10px] text-text-secondary">
                    {t.status}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <p className="text-center py-8 text-xs text-text-muted">
              No tasks scheduled for this day.
            </p>
          )}
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
        {createDate && (
          <TaskFormDialog
            projectId={projectId}
            members={members}
            isOpenControlled={Boolean(createDate)}
            onOpenChangeControlled={(open) => !open && setCreateDate(null)}
          />
        )}
      </div>
    );
  }

  if (viewMode === "week") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((day, idx) => (
          <div
            key={day.dateString}
            className={`flex flex-col rounded-xl border p-3 min-h-70 transition-colors ${
              day.isToday
                ? "border-primary/40 bg-surface-elevated/60 shadow-sm"
                : "border-border bg-surface"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
              <span className="text-xs font-semibold text-text-secondary uppercase">
                {dayNames[idx]}
              </span>
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                  day.isToday ? "bg-primary text-primary-foreground font-mono" : "text-text-primary font-mono"
                }`}
              >
                {day.dayNumber}
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
              {day.tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setSelectedTask(task)}
                  className="rounded-md border border-primary/20 bg-primary/10 p-2 text-left text-xs text-text-primary hover:bg-primary/20 transition-colors"
                >
                  <p className="font-medium truncate">{task.title}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{task.status}</p>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCreateDate(day.dateString)}
              className="mt-2 w-full rounded py-1 text-[11px] text-text-muted hover:bg-surface-elevated hover:text-text-primary transition-colors text-center"
            >
              + Add
            </button>
          </div>
        ))}

        {selectedTask && (
          <TaskFormDialog
            projectId={projectId}
            members={members}
            taskToEdit={selectedTask}
            isOpenControlled={Boolean(selectedTask)}
            onOpenChangeControlled={(open) => !open && setSelectedTask(null)}
          />
        )}
        {createDate && (
          <TaskFormDialog
            projectId={projectId}
            members={members}
            isOpenControlled={Boolean(createDate)}
            onOpenChangeControlled={(open) => !open && setCreateDate(null)}
          />
        )}
      </div>
    );
  }

  if (viewMode === "year") {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {months.map((m) => {
          const monthDate = new Date(year, m, 1);
          const monthName = monthDate.toLocaleDateString(undefined, { month: "short" });
          const daysInMonth = new Date(year, m + 1, 0).getDate();

          const monthTasks = tasks.filter((t) => {
            const startMonth = new Date(t.startDate).getMonth();
            const startYear = new Date(t.startDate).getFullYear();
            return startMonth === m && startYear === year;
          });

          return (
            <div
              key={m}
              className="flex flex-col rounded-xl border border-border bg-surface p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-bold text-text-primary">{monthName}</h5>
                <span className="text-xs text-text-muted font-mono">
                  {monthTasks.length} {monthTasks.length === 1 ? "task" : "tasks"}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const dStr = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const hasTasks = tasks.some(
                    (t) => t.startDate <= dStr && t.dueDate >= dStr
                  );
                  return (
                    <div
                      key={d}
                      className={`size-5 rounded flex items-center justify-center font-mono ${
                        hasTasks
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-text-muted hover:bg-surface-elevated"
                      }`}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Default: Month View
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
      {/* Day header row */}
      <div className="grid grid-cols-7 border-b border-border bg-surface-elevated/40 text-center text-xs font-semibold text-text-secondary py-2.5">
        {dayNames.map((name) => (
          <div key={name}>{name}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border/40">
        {monthCells.map((cell) => (
          <div
            key={cell.dateString}
            className={`group relative flex flex-col p-2 min-h-27.5 md:min-h-32.5 transition-colors ${
              cell.isCurrentMonth ? "bg-surface/60" : "bg-background/40 opacity-40"
            } ${cell.isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs font-mono font-medium ${
                  cell.isToday
                    ? "bg-primary text-primary-foreground font-bold"
                    : cell.isCurrentMonth
                    ? "text-text-primary"
                    : "text-text-muted"
                }`}
              >
                {cell.dayNumber}
              </span>

              <button
                type="button"
                onClick={() => setCreateDate(cell.dateString)}
                aria-label={`Add task on ${cell.dateString}`}
                className="opacity-0 group-hover:opacity-100 size-5 flex items-center justify-center rounded text-text-muted hover:bg-surface-elevated hover:text-text-primary transition-all text-xs"
              >
                +
              </button>
            </div>

            {/* Task chips */}
            <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar max-h-24">
              {cell.tasks.slice(0, 3).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setSelectedTask(task)}
                  className="truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium border border-primary/30 bg-primary/15 text-text-primary hover:bg-primary/25 hover:border-primary/50 transition-colors"
                >
                  {task.title}
                </button>
              ))}
              {cell.tasks.length > 3 && (
                <span className="text-[10px] font-mono text-text-muted pl-1">
                  +{cell.tasks.length - 3} more
                </span>
              )}
            </div>
          </div>
        ))}
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
      {createDate && (
        <TaskFormDialog
          projectId={projectId}
          members={members}
          isOpenControlled={Boolean(createDate)}
          onOpenChangeControlled={(open) => !open && setCreateDate(null)}
        />
      )}
    </div>
  );
}
