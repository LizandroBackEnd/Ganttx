"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskStatusBadge } from "./task-status-badge";
import { TaskPriorityBadge } from "./task-priority-badge";
import { TaskFormDialog, type ProjectMemberOption, type TaskEpicOption } from "./task-form-dialog";
import { updateTaskStatus, deleteTask } from "../api/task-mutations";
import { IconCheck, IconPencil, IconTrash, IconCrown } from "@tabler/icons-react";
import { sileo } from "sileo";
import {
  isTaskDone,
  toDoneBucket,
  toUndoneBucket,
  type TaskDTO,
  type CustomStatusOption,
  type CustomPriorityOption,
} from "../types/task.types";

export interface TaskRowProps {
  readonly task: TaskDTO;
  readonly members?: readonly ProjectMemberOption[];
  readonly availableEpics?: readonly TaskEpicOption[];
  readonly customStatuses?: readonly CustomStatusOption[] | null;
  readonly customPriorities?: readonly CustomPriorityOption[] | null;
  readonly canEdit?: boolean;
}

export function TaskRow({
  task,
  members = [],
  availableEpics = [],
  customStatuses,
  customPriorities,
  canEdit = true,
}: TaskRowProps): React.JSX.Element {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const isDone = isTaskDone(task.bucket);

  const handleStatusChange = async (newStatus: string): Promise<void> => {
    try {
      const res = await updateTaskStatus({ taskId: task.id, bucket: newStatus });
      if (res.success) {
        sileo.success({
          title: newStatus === "DONE" ? "Tarea completada" : "Estado actualizado",
          description: `"${task.title}" se marcó como ${newStatus === "DONE" ? "completada" : newStatus}.`,
        });
        router.refresh();
      } else {
        sileo.error({
          title: "Error al actualizar estado",
          description: res.error,
        });
      }
    } catch {
      sileo.error({
        title: "Error al actualizar estado",
        description: "Ocurrió un error inesperado.",
      });
    }
  };

  const handleDelete = async (): Promise<void> => {
    try {
      setIsDeleting(true);
      const res = await deleteTask({ taskId: task.id });
      if (res && !res.success) {
        sileo.error({
          title: "Error al eliminar tarea",
          description: res.error,
        });
        setIsDeleting(false);
        return;
      }
      sileo.success({
        title: "Tarea eliminada",
        description: `"${task.title}" se eliminó correctamente.`,
      });
      router.refresh();
    } catch {
      sileo.error({
        title: "Error al eliminar tarea",
        description: "Ocurrió un error inesperado al eliminar la tarea.",
      });
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className={`group flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/40 px-4 py-3 transition-colors hover:bg-surface-elevated/40 ${
        task.isEpic ? "bg-purple-500/5 border-l-2 border-l-purple-500" : "bg-surface/50"
      }`}>
        {/* Left main info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Quick status toggle */}
          <button
            type="button"
            onClick={() => handleStatusChange(isDone ? toUndoneBucket(task.bucket) : toDoneBucket(task.bucket))}
            aria-label={isDone ? "Marcar como sin completar" : "Marcar como completada"}
            className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer ${
              isDone
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                : "border-border hover:border-primary"
            }`}
          >
            {isDone && (
              <IconCheck className="size-3.5 stroke-3" />
            )}
          </button>

          {/* Title */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {task.isEpic && (
                <span className="flex items-center gap-1 rounded bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 text-[10px] font-bold uppercase text-purple-300 font-mono">
                  <IconCrown className="size-3" />
                  EPIC
                </span>
              )}
              {task.parent && !task.isEpic && (
                <span className="text-[10px] font-mono text-purple-400/90 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                  {task.parent.title}
                </span>
              )}
              <span
                className={`text-sm font-medium text-text-primary ${
                  isDone ? "line-through text-text-muted" : ""
                }`}
              >
                {task.title}
              </span>
            </div>

            {task.description && (
              <p className="truncate text-xs text-text-secondary mt-0.5">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Right columns */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 text-xs text-text-muted">
          {/* Fechas */}
          <span className="font-mono text-[11px] text-text-secondary">
            {task.startDate.slice(5)} → {task.dueDate.slice(5)}
          </span>

          {/* Predecesoras */}
          {task.predecessors && (
            <span className="rounded bg-surface-elevated/60 px-1.5 py-0.5 font-mono text-[10px] text-text-muted" title={`Predecesoras: ${task.predecessors}`}>
              Pred: {task.predecessors}
            </span>
          )}

          {/* Estado & Prioridad/Etiqueta */}
          <TaskPriorityBadge label={task.label} customPriorities={customPriorities} />
          <TaskStatusBadge bucket={task.bucket} />

          {/* Asignado */}
          {task.assignee ? (
            <span
              title={task.assignee.name ?? task.assignee.email}
              className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary"
            >
              {(task.assignee.name?.[0] ?? task.assignee.email[0])?.toUpperCase()}
            </span>
          ) : (
            <span className="text-[11px] text-text-muted italic">Sin asignar</span>
          )}

          {/* Acciones */}
          {canEdit && (
            <div className="flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => setIsEditDialogOpen(true)}
                className="rounded p-1 text-text-muted hover:bg-surface-elevated hover:text-text-primary cursor-pointer"
                title="Editar tarea"
              >
                <IconPencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded p-1 text-text-muted hover:bg-destructive/20 hover:text-destructive cursor-pointer"
                title="Eliminar tarea"
              >
                <IconTrash className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditDialogOpen && (
        <TaskFormDialog
          projectId={task.projectId}
          members={members}
          availableEpics={availableEpics}
          customStatuses={customStatuses}
          customPriorities={customPriorities}
          taskToEdit={task}
          isOpenControlled={isEditDialogOpen}
          onOpenChangeControlled={setIsEditDialogOpen}
        />
      )}
    </>
  );
}
