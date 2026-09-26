"use client";

import { useState, useMemo } from "react";
import { TaskRow } from "./task-row";
import { TaskFormDialog, type ProjectMemberOption } from "./task-form-dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { IconInbox, IconPlus, IconSearch } from "@tabler/icons-react";
import type {
  TaskDTO,
  TaskParentDTO,
  CustomStatusOption,
  CustomPriorityOption,
} from "../types/task.types";

export interface TaskTableProps {
  readonly projectId: string;
  readonly tasks: readonly TaskDTO[];
  readonly members?: readonly ProjectMemberOption[];
  readonly availableEpics?: readonly TaskParentDTO[];
  readonly customStatuses?: readonly CustomStatusOption[] | null;
  readonly customPriorities?: readonly CustomPriorityOption[] | null;
  readonly canEdit?: boolean;
}

export function TaskTable({
  projectId,
  tasks,
  members = [],
  availableEpics: propEpics,
  customStatuses,
  customPriorities,
  canEdit = true,
}: TaskTableProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const availableEpics = useMemo<TaskParentDTO[]>(() => {
    if (propEpics) return [...propEpics];
    return tasks
      .filter((t) => t.isEpic)
      .map((t) => ({ id: t.id, title: t.title }));
  }, [propEpics, tasks]);

  const filterTabs = useMemo<{ id: string; label: string }[]>(() => {
    if (customStatuses && customStatuses.length > 0) {
      return [
        { id: "ALL", label: "Todas" },
        ...customStatuses.map((s) => ({ id: s.id, label: s.label })),
      ];
    }
    return [
      { id: "ALL", label: "Todas" },
      { id: "TODO", label: "Por Hacer" },
      { id: "IN_PROGRESS", label: "En Progreso" },
      { id: "IN_REVIEW", label: "En Revisión" },
      { id: "DONE", label: "Completadas" },
    ];
  }, [customStatuses]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesTab = activeTab === "ALL" || task.bucket === activeTab;
      const matchesSearch =
        !searchQuery.trim() ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [tasks, activeTab, searchQuery]);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border p-4 bg-surface-elevated/40">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {filterTabs.map((tab) => {
            const count =
              tab.id === "ALL"
                ? tasks.length
                : tasks.filter((t) => t.bucket === tab.id).length;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isActive ? "bg-primary text-primary-foreground font-mono" : "bg-surface-elevated text-text-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
            <Input
              type="search"
              placeholder="Buscar tareas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-44 md:w-56 pl-8 text-xs border-border bg-background"
            />
          </div>

          {canEdit && (
            <TaskFormDialog
              projectId={projectId}
              members={members}
              availableEpics={availableEpics}
              customStatuses={customStatuses}
              customPriorities={customPriorities}
              trigger={
                <Button size="sm" variant="default" className="bg-primary text-primary-foreground hover:bg-primary-hover shrink-0">
                  <IconPlus className="size-3.5 mr-1" />
                  Nueva Tarea
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Task list rows */}
      <div className="flex flex-col divide-y divide-border/30">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              members={members}
              availableEpics={availableEpics}
              customStatuses={customStatuses}
              customPriorities={customPriorities}
              canEdit={canEdit}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-surface-elevated text-text-muted mb-3">
              <IconInbox className="size-5" />
            </div>
            <h4 className="text-sm font-semibold text-text-primary">No se encontraron tareas</h4>
            <p className="mt-1 text-xs text-text-secondary max-w-xs">
              {searchQuery
                ? "No hay tareas que coincidan con la búsqueda."
                : "Aún no hay tareas en este estado."}
            </p>
            {canEdit && !searchQuery && (
              <div className="mt-4">
                <TaskFormDialog
                  projectId={projectId}
                  members={members}
                  availableEpics={availableEpics}
                  customStatuses={customStatuses}
                  customPriorities={customPriorities}
                  trigger={
                    <Button size="sm" variant="outline" className="border-border">
                      <IconPlus className="size-3.5 mr-1" />
                      Crear Primera Tarea
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
