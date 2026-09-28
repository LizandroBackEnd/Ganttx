"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { GanttHeader } from "./gantt-header";
import { GanttBar } from "./gantt-bar";
import { useGanttDrag } from "../hooks/use-gantt-drag";
import {
  TaskFormDialog,
  type ProjectMemberOption,
  type TaskDTO,
  type TaskParentDTO,
  type CustomStatusOption,
  type CustomPriorityOption,
} from "@/features/tasks";
import { Button } from "@/shared/components/ui/button";
import {
  IconPlus,
  IconTimeline,
  IconCrown,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconChevronRight,
} from "@tabler/icons-react";
import type { GanttDayColumn } from "../types/gantt.types";
import { cn } from "@/lib/utils";

export interface GanttChartProps {
  readonly projectId: string;
  readonly tasks: readonly TaskDTO[];
  readonly members?: readonly ProjectMemberOption[];
  readonly availableEpics?: readonly TaskParentDTO[];
  readonly customStatuses?: readonly CustomStatusOption[] | null;
  readonly customPriorities?: readonly CustomPriorityOption[] | null;
  readonly onTaskUpdated?: () => void;
  /** Controlled fullscreen state — lifted up from project-workspace */
  readonly isFullscreen?: boolean;
  readonly onToggleFullscreen?: () => void;
}

const COLUMN_WIDTH_PX = 36;
const ROW_HEIGHT_PX = 44;
const HEADER_HEIGHT_PX = 65;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 620;
const DEFAULT_SIDEBAR_WIDTH = 320;

const MIN_COL_WIDTH = 40;
const MAX_COL_WIDTH = 200;

interface ColWidths {
  start: number;
  due: number;
  assignee: number;
  predecessor: number;
}

function formatLocalDateToIsoString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year?.slice(2)}`;
}

/** Sort tasks: epics in creation order, each immediately followed by their subtasks */
function sortTasksHierarchically(tasks: readonly TaskDTO[]): TaskDTO[] {
  const epics = tasks.filter((t) => t.isEpic);
  const subtasksByParent = new Map<string, TaskDTO[]>();
  const standalones: TaskDTO[] = [];

  for (const t of tasks) {
    if (t.isEpic) continue;
    if (t.parentId) {
      const arr = subtasksByParent.get(t.parentId) ?? [];
      arr.push(t);
      subtasksByParent.set(t.parentId, arr);
    } else {
      standalones.push(t);
    }
  }

  const sorted: TaskDTO[] = [];
  for (const epic of epics) {
    sorted.push(epic);
    const children = subtasksByParent.get(epic.id) ?? [];
    sorted.push(...children);
  }
  sorted.push(...standalones);
  return sorted;
}

/** Given predecessors string "id1,id2" return the titles */
function getPredecessorTitles(
  predecessors: string | null,
  taskMap: Map<string, TaskDTO>
): string {
  if (!predecessors) return "—";
  return predecessors
    .split(",")
    .map((id) => taskMap.get(id.trim())?.title ?? id.trim().slice(0, 8))
    .join(", ");
}

interface PredecessorArrow {
  fromTaskId: string;
  toTaskId: string;
  fromX: number; // right edge of predecessor bar
  fromY: number; // center Y of predecessor row
  toX: number;   // left edge of successor bar
  toY: number;   // center Y of successor row
}

export function GanttChart({
  projectId,
  tasks,
  members = [],
  availableEpics,
  customStatuses,
  customPriorities,
  onTaskUpdated,
  isFullscreen = false,
  onToggleFullscreen,
}: GanttChartProps): React.JSX.Element {
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [colWidths, setColWidths] = useState<ColWidths>({
    start: 56,
    due: 56,
    assignee: 64,
    predecessor: 64,
  });
  const [collapsedEpics, setCollapsedEpics] = useState<Set<string>>(new Set());
  const isResizing = useRef(false);

  const { dragState, startDrag } = useGanttDrag({
    columnWidthPx: COLUMN_WIDTH_PX,
    onDatesUpdated: onTaskUpdated,
  });

  // ── Task map for predecessor lookups ──────────────────────────────────
  const taskMap = useMemo(() => {
    const m = new Map<string, TaskDTO>();
    for (const t of tasks) m.set(t.id, t);
    return m;
  }, [tasks]);

  // ── Sorted rows (epics + subtasks grouped) ────────────────────────────
  const sortedTasks = useMemo(() => sortTasksHierarchically(tasks), [tasks]);

  // ── Visible rows after collapse ───────────────────────────────────────
  const visibleTasks = useMemo(() => {
    return sortedTasks.filter((t) => {
      if (!t.parentId) return true;
      return !collapsedEpics.has(t.parentId);
    });
  }, [sortedTasks, collapsedEpics]);

  const toggleEpicCollapse = useCallback((epicId: string) => {
    setCollapsedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) next.delete(epicId);
      else next.add(epicId);
      return next;
    });
  }, []);

  // ── Timeline columns ──────────────────────────────────────────────────
  const { columns, timelineStartIso } = useMemo(() => {
    let minDate = new Date();
    let maxDate = new Date();

    if (tasks.length > 0) {
      const startTimes = tasks.map((t) =>
        new Date(`${t.startDate}T00:00:00.000Z`).getTime()
      );
      const dueTimes = tasks.map((t) =>
        new Date(`${t.dueDate}T00:00:00.000Z`).getTime()
      );
      minDate = new Date(Math.min(...startTimes));
      maxDate = new Date(Math.max(...dueTimes));
    }

    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);

    const cols: GanttDayColumn[] = [];
    const curr = new Date(minDate);
    const todayIso = formatLocalDateToIsoString(new Date());

    while (curr <= maxDate) {
      const dateString = formatLocalDateToIsoString(curr);
      const dayOfWeek = curr.getDay();
      const monthName = curr.toLocaleDateString("es-ES", {
        month: "short",
        year: "numeric",
      });
      const dayName = curr.toLocaleDateString("es-ES", { weekday: "short" });

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
      timelineStartIso: cols[0]?.dateString ?? formatLocalDateToIsoString(new Date()),
    };
  }, [tasks]);

  const timelineWidthPx = columns.length * COLUMN_WIDTH_PX;

  // ── Predecessor arrows ────────────────────────────────────────────────
  const predecessorArrows = useMemo((): PredecessorArrow[] => {
    const arrows: PredecessorArrow[] = [];

    // row index in visibleTasks
    const rowIndex = new Map<string, number>();
    visibleTasks.forEach((t, i) => rowIndex.set(t.id, i));

    const getDayDiff = (start: string, target: string): number => {
      const d1 = new Date(`${start}T00:00:00.000Z`).getTime();
      const d2 = new Date(`${target}T00:00:00.000Z`).getTime();
      return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    };

    for (const task of visibleTasks) {
      if (!task.predecessors) continue;

      const predecessorIds = task.predecessors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      for (const predId of predecessorIds) {
        const predTask = taskMap.get(predId);
        if (!predTask) continue;

        const fromRow = rowIndex.get(predId);
        const toRow = rowIndex.get(task.id);
        if (fromRow === undefined || toRow === undefined) continue;

        // X: right edge of predecessor bar
        const predStartOffset = getDayDiff(timelineStartIso, predTask.startDate);
        const predDuration = Math.max(
          1,
          getDayDiff(predTask.startDate, predTask.dueDate) + 1
        );
        const fromX = (predStartOffset + predDuration) * COLUMN_WIDTH_PX;

        // X: left edge of successor bar
        const toOffset = getDayDiff(timelineStartIso, task.startDate);
        const toX = toOffset * COLUMN_WIDTH_PX;

        // Y centers (header height ~65px accounted in parent)
        const fromY = fromRow * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2;
        const toY = toRow * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2;

        arrows.push({
          fromTaskId: predId,
          toTaskId: task.id,
          fromX,
          fromY,
          toX,
          toY,
        });
      }
    }

    return arrows;
  }, [visibleTasks, taskMap, timelineStartIso]);

  // ── Sidebar total-width resize ────────────────────────────────────────
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      isResizing.current = true;
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const onMouseMove = (ev: MouseEvent): void => {
        if (!isResizing.current) return;
        const delta = ev.clientX - startX;
        const next = Math.min(
          MAX_SIDEBAR_WIDTH,
          Math.max(MIN_SIDEBAR_WIDTH, startWidth + delta)
        );
        setSidebarWidth(next);
      };

      const onMouseUp = (): void => {
        isResizing.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [sidebarWidth]
  );

  // ── Per-column resize factory ─────────────────────────────────────────
  const makeColResizeHandler = useCallback(
    (col: keyof ColWidths) =>
      (e: React.MouseEvent<HTMLDivElement>): void => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startW = colWidths[col];

        const onMove = (ev: MouseEvent): void => {
          const next = Math.min(
            MAX_COL_WIDTH,
            Math.max(MIN_COL_WIDTH, startW + ev.clientX - startX)
          );
          setColWidths((prev) => ({ ...prev, [col]: next }));
        };
        const onUp = (): void => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      },
    [colWidths]
  );

  // ── Empty state ───────────────────────────────────────────────────────
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-border bg-surface">
        <div className="flex size-10 items-center justify-center rounded-xl bg-surface-elevated text-text-muted mb-3">
          <IconTimeline className="size-5 text-primary" />
        </div>
        <h4 className="text-sm font-semibold text-text-primary">
          No hay tareas en el cronograma
        </h4>
        <p className="mt-1 text-xs text-text-secondary max-w-xs">
          Crea tu primera tarea para visualizar la línea de tiempo interactiva de Gantt.
        </p>
        <div className="mt-4">
          <TaskFormDialog
            projectId={projectId}
            members={members}
            availableEpics={availableEpics}
            availableTasks={tasks}
            customStatuses={customStatuses}
            customPriorities={customPriorities}
            trigger={
              <Button
                size="sm"
                variant="default"
                className="bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                <IconPlus className="size-3.5 mr-1" />
                Crear Primera Tarea
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden shadow-sm h-full">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface-elevated/40">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
          Cronograma
        </span>
        <div className="flex items-center gap-2">
          <TaskFormDialog
            projectId={projectId}
            members={members}
            availableEpics={availableEpics}
            availableTasks={tasks}
            customStatuses={customStatuses}
            customPriorities={customPriorities}
            trigger={
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                <IconPlus className="size-3 mr-0.5" />
                Nueva tarea
              </Button>
            }
          />
          {onToggleFullscreen && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullscreen ? (
                <IconArrowsMinimize className="size-3.5" />
              ) : (
                <IconArrowsMaximize className="size-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Chart body: single 2D scroll container where each row wraps both sidebar and timeline */}
      <div className="flex-1 min-h-0 overflow-auto relative bg-surface/30">
        <div
          style={{
            width: `${sidebarWidth + timelineWidthPx}px`,
            minWidth: `${sidebarWidth + timelineWidthPx}px`,
          }}
          className="relative flex flex-col"
        >
          {/* ── Fixed sticky header (Month/Day timescale + column headers) ── */}
          <div
            style={{ height: `${HEADER_HEIGHT_PX}px` }}
            className="sticky top-0 z-30 flex border-b border-border bg-surface shrink-0 select-none"
          >
            {/* Left header: Actividad, Inicio, Fin, Asignado, Predecesor (sticky left-0) */}
            <div
              style={{ width: `${sidebarWidth}px` }}
              className="sticky left-0 z-40 bg-surface border-r border-border shrink-0 flex items-end"
            >
              <div className="flex w-full text-[10px] font-semibold text-text-secondary uppercase tracking-wider pb-1.5 overflow-hidden">
                {/* Activity — flex-1 */}
                <span className="flex-1 min-w-0 truncate pl-2">Actividad</span>

                {/* Resizable column headers */}
                {(
                  [
                    ["start", "Inicio", "text-center"],
                    ["due", "Fin", "text-center"],
                    ["assignee", "Asignado", "text-center"],
                    ["predecessor", "Predecesor", "text-right pr-2"],
                  ] as const
                ).map(([key, label, align]) => (
                  <div
                    key={key}
                    style={{ width: `${colWidths[key]}px` }}
                    className="relative shrink-0 group/col"
                  >
                    <span className={cn("block truncate", align)}>{label}</span>
                    {/* Drag handle */}
                    <div
                      onMouseDown={makeColResizeHandler(key)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity z-10"
                    >
                      <div className="w-px h-3 bg-border group-hover/col:bg-primary/60 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Sidebar total-width resize handle */}
              <div
                onMouseDown={handleResizeMouseDown}
                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/40 transition-colors z-50 group flex items-center justify-center"
                title="Arrastra para redimensionar panel"
              >
                <div className="w-1 h-6 rounded-full bg-border group-hover:bg-primary/60 transition-colors" />
              </div>
            </div>

            {/* Right header: Timescale (Month + Day columns) */}
            <div style={{ width: `${timelineWidthPx}px` }} className="shrink-0 h-full">
              <GanttHeader columns={columns} columnWidthPx={COLUMN_WIDTH_PX} />
            </div>
          </div>

          {/* ── Rows container with background grid & arrows ── */}
          <div className="relative flex flex-col divide-y divide-border/30">
            {/* Background vertical day grid lines */}
            <div
              className="absolute top-0 bottom-0 flex pointer-events-none"
              style={{
                left: `${sidebarWidth}px`,
                width: `${timelineWidthPx}px`,
              }}
            >
              {columns.map((col) => (
                <div
                  key={`grid-${col.dateString}`}
                  style={{ width: `${COLUMN_WIDTH_PX}px` }}
                  className={cn(
                    "border-r border-border/20 h-full shrink-0",
                    col.isToday
                      ? "bg-primary/5 ring-1 ring-inset ring-primary/20"
                      : col.isWeekend
                      ? "bg-background/20"
                      : ""
                  )}
                />
              ))}
            </div>

            {/* Predecessor arrows SVG overlay */}
            {predecessorArrows.length > 0 && (
              <svg
                className="absolute pointer-events-none z-20"
                style={{
                  left: `${sidebarWidth}px`,
                  top: 0,
                  width: `${timelineWidthPx}px`,
                  height: `${visibleTasks.length * ROW_HEIGHT_PX}px`,
                }}
                overflow="visible"
              >
                <defs>
                  <marker
                    id="arrow-head"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <path
                      d="M0,0 L0,6 L6,3 z"
                      fill="rgba(148,163,184,0.7)"
                    />
                  </marker>
                </defs>
                {predecessorArrows.map((arrow) => {
                  const midX = (arrow.fromX + arrow.toX) / 2;
                  const path =
                    arrow.fromY === arrow.toY
                      ? `M${arrow.fromX},${arrow.fromY} L${arrow.toX},${arrow.toY}`
                      : `M${arrow.fromX},${arrow.fromY} C${midX},${arrow.fromY} ${midX},${arrow.toY} ${arrow.toX},${arrow.toY}`;
                  return (
                    <path
                      key={`${arrow.fromTaskId}-${arrow.toTaskId}`}
                      d={path}
                      fill="none"
                      stroke="rgba(148,163,184,0.55)"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      markerEnd="url(#arrow-head)"
                    />
                  );
                })}
              </svg>
            )}

            {/* Rows: Each row wraps both left columns and right timeline cell */}
            {visibleTasks.map((task) => {
              const isCollapsed = task.isEpic && collapsedEpics.has(task.id);
              const hasChildren =
                task.isEpic && sortedTasks.some((t) => t.parentId === task.id);
              const assigneeName =
                task.assignee?.name?.split(" ")[0] ??
                task.assignee?.email?.split("@")[0] ??
                "—";
              const predLabel = getPredecessorTitles(task.predecessors, taskMap);

              return (
                <div
                  key={task.id}
                  style={{ height: `${ROW_HEIGHT_PX}px` }}
                  onMouseEnter={() => setHoveredTaskId(task.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                  className={cn(
                    "group flex transition-colors",
                    task.isEpic
                      ? hoveredTaskId === task.id
                        ? "bg-purple-500/15"
                        : "bg-purple-500/5 hover:bg-purple-500/10"
                      : hoveredTaskId === task.id
                      ? "bg-primary/8"
                      : "hover:bg-surface-elevated/40"
                  )}
                >
                  {/* Left column (sticky left-0) */}
                  <div
                    style={{ width: `${sidebarWidth}px` }}
                    className={cn(
                      "sticky left-0 z-10 shrink-0 flex items-center px-2 gap-1 text-left border-r border-border transition-colors",
                      task.isEpic
                        ? hoveredTaskId === task.id
                          ? "bg-purple-950/40 border-l-2 border-l-purple-500"
                          : "bg-surface/95 border-l-2 border-l-purple-500 group-hover:bg-purple-950/20"
                        : task.parentId
                        ? hoveredTaskId === task.id
                          ? "bg-surface-elevated pl-5"
                          : "bg-surface pl-5 group-hover:bg-surface-elevated"
                        : hoveredTaskId === task.id
                        ? "bg-surface-elevated"
                        : "bg-surface group-hover:bg-surface-elevated"
                    )}
                  >
                    {/* Collapse toggle for epics */}
                    {task.isEpic && hasChildren ? (
                      <button
                        type="button"
                        className="shrink-0 text-purple-400 hover:text-purple-300 transition-transform"
                        style={{
                          transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                        }}
                        onClick={() => toggleEpicCollapse(task.id)}
                      >
                        <IconChevronRight className="size-3" />
                      </button>
                    ) : task.isEpic ? (
                      <IconCrown className="size-3 text-purple-400 shrink-0" />
                    ) : (
                      <span className="size-3 shrink-0" />
                    )}

                    {/* Activity name */}
                    <button
                      type="button"
                      className="flex-1 min-w-0 text-left"
                      onClick={() => setSelectedTask(task)}
                    >
                      <span className="truncate text-[11px] font-medium text-text-primary block">
                        {task.title}
                      </span>
                    </button>

                    {/* Start date */}
                    <span
                      style={{ width: `${colWidths.start}px` }}
                      className="shrink-0 text-center text-[10px] text-text-muted font-mono truncate"
                    >
                      {formatShortDate(task.startDate)}
                    </span>

                    {/* Due date */}
                    <span
                      style={{ width: `${colWidths.due}px` }}
                      className="shrink-0 text-center text-[10px] text-text-muted font-mono truncate"
                    >
                      {formatShortDate(task.dueDate)}
                    </span>

                    {/* Assignee */}
                    <span
                      style={{ width: `${colWidths.assignee}px` }}
                      className="shrink-0 text-center text-[10px] text-text-secondary truncate"
                    >
                      {assigneeName}
                    </span>

                    {/* Predecessor */}
                    <span
                      style={{ width: `${colWidths.predecessor}px` }}
                      className="shrink-0 text-right text-[10px] text-text-muted truncate pr-2"
                      title={predLabel === "—" ? undefined : predLabel}
                    >
                      {predLabel}
                    </span>
                  </div>

                  {/* Right timeline cell containing Gantt bar */}
                  <div
                    style={{ width: `${timelineWidthPx}px` }}
                    className="relative shrink-0 flex items-center h-full"
                  >
                    <GanttBar
                      task={task}
                      timelineStartIso={timelineStartIso}
                      columnWidthPx={COLUMN_WIDTH_PX}
                      dragState={dragState}
                      onStartDrag={startDrag}
                      onClick={() => setSelectedTask(task)}
                      customStatuses={customStatuses}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskFormDialog
          projectId={projectId}
          members={members}
          availableEpics={availableEpics}
          availableTasks={tasks}
          customStatuses={customStatuses}
          customPriorities={customPriorities}
          taskToEdit={selectedTask}
          isOpenControlled={Boolean(selectedTask)}
          onOpenChangeControlled={(open) => !open && setSelectedTask(null)}
        />
      )}
    </div>
  );
}
