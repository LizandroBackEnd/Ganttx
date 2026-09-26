"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  IconSearch,
  IconCheck,
  IconX,
  IconChevronDown,
  IconLink,
  IconCrown,
  IconLayersLinked,
  IconLoader2,
  IconFilter,
} from "@tabler/icons-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/lib/utils";
import { TaskStatusBadge } from "./task-status-badge";
import { SingleTaskPriorityBadge } from "./task-priority-badge";
import { getProjectTasksForPredecessors } from "../api/task-mutations";
import {
  getTaskBucketId,
  type CustomStatusOption,
  type CustomPriorityOption,
  type TaskDTO,
  type TaskPredecessorCandidateDTO,
} from "../types/task.types";

export interface TaskPredecessorsSelectorProps {
  readonly projectId: string;
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
  readonly currentTaskId?: string;
  readonly availableTasks?: readonly (TaskDTO | TaskPredecessorCandidateDTO)[];
  readonly customStatuses?: readonly CustomStatusOption[] | null;
  readonly customPriorities?: readonly CustomPriorityOption[] | null;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function TaskPredecessorsSelector({
  projectId,
  value,
  onChange,
  currentTaskId,
  availableTasks: propTasks,
  customStatuses,
  customPriorities,
  disabled = false,
  className,
}: TaskPredecessorsSelectorProps): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "EPIC" | "STANDARD">("ALL");

  const [fetchedTasks, setFetchedTasks] = useState<TaskPredecessorCandidateDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const hasLoadedRef = useRef<boolean>(false);

  // Load project tasks if not provided via props
  useEffect(() => {
    if (propTasks && propTasks.length > 0) return;
    if (hasLoadedRef.current || !projectId) return;

    hasLoadedRef.current = true;
    setIsLoading(true);
    void getProjectTasksForPredecessors(projectId)
      .then((res) => {
        if (res.success && res.data) {
          setFetchedTasks(res.data);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [projectId, propTasks]);

  const allTasks = useMemo(() => {
    if (propTasks && propTasks.length > 0) {
      return propTasks;
    }
    return fetchedTasks;
  }, [propTasks, fetchedTasks]);

  // Exclude current task and its subtasks to avoid circular / invalid dependency
  const eligibleTasks = useMemo(() => {
    return allTasks.filter((t) => {
      if (currentTaskId && t.id === currentTaskId) return false;
      if (currentTaskId && t.parentId === currentTaskId) return false;
      return true;
    });
  }, [allTasks, currentTaskId]);

  // Parse comma-separated string value into titles
  const selectedTitles = useMemo(() => {
    if (!value) return [];
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [value]);

  // Filter tasks based on search and selected filter pills
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return eligibleTasks.filter((task) => {
      if (query && !task.title.toLowerCase().includes(query)) {
        return false;
      }

      if (statusFilter !== "ALL") {
        const bId = getTaskBucketId(task.bucket);
        if (bId !== statusFilter && task.bucket !== statusFilter) {
          return false;
        }
      }

      if (typeFilter === "EPIC" && !task.isEpic) {
        return false;
      }
      if (typeFilter === "STANDARD" && task.isEpic) {
        return false;
      }

      return true;
    });
  }, [eligibleTasks, searchQuery, statusFilter, typeFilter]);

  const handleToggleTask = (taskTitle: string): void => {
    const isSelected = selectedTitles.includes(taskTitle);
    let next: string[];
    if (isSelected) {
      next = selectedTitles.filter((t) => t !== taskTitle);
    } else {
      next = [...selectedTitles, taskTitle];
    }
    onChange(next.length > 0 ? next.join(", ") : null);
  };

  const handleRemoveChip = (
    e: React.MouseEvent,
    titleToRemove: string
  ): void => {
    e.stopPropagation();
    const next = selectedTitles.filter((t) => t !== titleToRemove);
    onChange(next.length > 0 ? next.join(", ") : null);
  };

  const handleClearAll = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onChange(null);
  };

  const isFirstTaskOrEmpty = eligibleTasks.length === 0 && !isLoading;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((prev) => !prev);
            }
          }}
          className={cn(
            "group flex items-center justify-between gap-2 min-h-9 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs transition-colors cursor-pointer select-none",
            open && "border-primary/60 ring-1 ring-primary/30",
            disabled && "opacity-50 pointer-events-none cursor-not-allowed",
            className
          )}
        >
          {/* Left area: Chips or Placeholder */}
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            {selectedTitles.length === 0 ? (
              <div className="flex items-center gap-2 text-text-muted truncate">
                <IconLink className="size-3.5 text-text-muted/60 shrink-0" />
                <span className="truncate">
                  {isFirstTaskOrEmpty
                    ? "Sin tareas previas disponibles (primera tarea)"
                    : "Buscar o seleccionar tarea predecesora..."}
                </span>
              </div>
            ) : (
              selectedTitles.map((title) => (
                <span
                  key={title}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-surface-elevated/80 border border-border/80 px-2 py-0.5 text-[11px] font-medium text-text-primary transition-colors group/chip hover:border-primary/40"
                  title={title}
                >
                  <IconLink className="size-3 text-primary/70 shrink-0" />
                  <span className="max-w-44 truncate">{title}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveChip(e, title)}
                    className="size-3.5 rounded-full flex items-center justify-center text-text-muted hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    aria-label={`Quitar ${title}`}
                  >
                    <IconX className="size-2.5 stroke-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Right area: Actions & Icon */}
          <div className="flex items-center gap-1 shrink-0 text-text-muted">
            {selectedTitles.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="p-1 rounded-md hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                title="Limpiar todas"
              >
                <IconX className="size-3" />
              </button>
            )}
            <IconChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                open && "rotate-180 text-primary"
              )}
            />
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[90vw] sm:w-105 max-w-[95vw] p-3 rounded-2xl border border-border bg-surface shadow-2xl flex flex-col gap-2.5 z-100 backdrop-blur-md"
      >
        {/* Search input with search icon */}
        <div className="relative flex items-center">
          <IconSearch className="absolute left-3 size-3.5 text-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar tarea por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-7 text-xs rounded-xl bg-background border border-border focus:border-primary focus:outline-none text-text-primary placeholder:text-text-muted transition-colors"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <IconX className="size-3" />
            </button>
          )}
        </div>

        {/* Filter bar: Status & Type */}
        <div className="flex flex-col gap-1.5 pt-0.5 border-t border-border/40">
          <div className="flex items-center justify-between text-[10px] text-text-muted font-medium px-0.5">
            <span className="flex items-center gap-1">
              <IconFilter className="size-3" /> Filtros
            </span>
            <span>
              {filteredTasks.length} de {eligibleTasks.length} tareas
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {/* Status filters */}
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer border",
                statusFilter === "ALL"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-surface-elevated/50 text-text-muted hover:text-text-primary border-transparent hover:bg-surface-elevated"
              )}
            >
              Todos
            </button>

            {/* Custom or fallback statuses */}
            {(customStatuses && customStatuses.length > 0
              ? customStatuses
              : [
                  { id: "TODO", label: "Por Hacer" },
                  { id: "IN_PROGRESS", label: "En Progreso" },
                  { id: "DONE", label: "Completada" },
                ]
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() =>
                  setStatusFilter((prev) => (prev === st.id ? "ALL" : st.id))
                }
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer border truncate max-w-28",
                  statusFilter === st.id
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-surface-elevated/50 text-text-muted hover:text-text-primary border-transparent hover:bg-surface-elevated"
                )}
              >
                {st.label}
              </button>
            ))}

            <div className="h-3 w-px bg-border/60 mx-1" />

            {/* Epic filter toggle */}
            <button
              type="button"
              onClick={() =>
                setTypeFilter((prev) => (prev === "EPIC" ? "ALL" : "EPIC"))
              }
              className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer border flex items-center gap-1",
                typeFilter === "EPIC"
                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                  : "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border-purple-500/20"
              )}
            >
              <IconCrown className="size-2.5" />
              Epics
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-0.5 pt-1 border-t border-border/40">
          {isLoading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-text-muted text-xs">
              <IconLoader2 className="size-4 animate-spin text-primary" />
              <span>Cargando tareas del proyecto...</span>
            </div>
          ) : isFirstTaskOrEmpty ? (
            <div className="py-6 px-4 flex flex-col items-center justify-center text-center gap-2 rounded-xl bg-surface-elevated/30 border border-border/40 my-1">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <IconLayersLinked className="size-4" />
              </div>
              <p className="text-xs font-semibold text-text-primary">
                No hay tareas predecesoras disponibles
              </p>
              <p className="text-[11px] text-text-muted max-w-xs leading-relaxed">
                Esta es la primera tarea del proyecto o aún no existen otras tareas para vincular. Una vez que agregues más tareas podrás elegirlas como predecesoras.
              </p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-6 flex flex-col items-center justify-center gap-1 text-center text-text-muted text-xs">
              <span>No se encontraron tareas</span>
              <span className="text-[11px] text-text-muted/70">
                Prueba ajustando el texto de búsqueda o los filtros
              </span>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isSelected = selectedTitles.includes(task.title);

              return (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.title)}
                  className={cn(
                    "flex items-center justify-between gap-2.5 p-2 rounded-xl border transition-all cursor-pointer select-none",
                    isSelected
                      ? "bg-primary/10 border-primary/40 hover:bg-primary/15"
                      : "bg-surface-elevated/40 border-border/50 hover:bg-surface-elevated hover:border-border"
                  )}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Checkbox indicator */}
                    <div
                      className={cn(
                        "mt-0.5 size-4 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border/80 bg-background"
                      )}
                    >
                      {isSelected && <IconCheck className="size-2.5 stroke-3" />}
                    </div>

                    {/* Task Title & Details */}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {task.isEpic && (
                          <IconCrown
                            className="size-3 text-purple-400 shrink-0"
                            title="Tarea Maestra (Epic)"
                          />
                        )}
                        <span
                          className={cn(
                            "text-xs font-medium leading-tight truncate",
                            isSelected ? "text-text-primary font-semibold" : "text-text-secondary"
                          )}
                        >
                          {task.title}
                        </span>
                      </div>

                      {/* Sub-info: Status & Priority Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <TaskStatusBadge bucket={task.bucket} className="text-[9px] px-1.5 py-0" />
                        {task.label && (
                          <SingleTaskPriorityBadge
                            value={task.label}
                            customPriorities={customPriorities}
                            className="text-[9px] px-1.5 py-0"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Check mark or state */}
                  {isSelected && (
                    <span className="text-[10px] font-semibold text-primary shrink-0 px-1.5 py-0.5 rounded-full bg-primary/15">
                      Predecesora
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info & close */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-text-muted">
          <span>
            {selectedTitles.length === 0
              ? "Sin predecesoras"
              : `${selectedTitles.length} ${
                  selectedTitles.length === 1 ? "predecesora elegida" : "predecesoras elegidas"
                }`}
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary-hover transition-colors cursor-pointer"
          >
            Listo
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
