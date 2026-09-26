"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TaskPriorityBadge } from "./task-priority-badge";
import { TaskFormDialog, type ProjectMemberOption, type TaskEpicOption } from "./task-form-dialog";
import {
  IconClock,
  IconGripVertical,
  IconCrown,
  IconPencil,
  IconUser,
  IconFolder,
  IconTrash,
  IconDiamond,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { deleteTask } from "../api/task-mutations";
import { sileo } from "sileo";
import type { TaskDTO, CustomStatusOption, CustomPriorityOption } from "../types/task.types";

export interface TaskCardProps {
  readonly task: TaskDTO;
  readonly projectId: string;
  readonly members?: readonly ProjectMemberOption[];
  readonly availableEpics?: readonly TaskEpicOption[];
  readonly customStatuses?: readonly CustomStatusOption[] | null;
  readonly customPriorities?: readonly CustomPriorityOption[] | null;
  readonly canEdit?: boolean;
}

export function TaskCard({
  task,
  projectId,
  members = [],
  availableEpics = [],
  customStatuses,
  customPriorities,
  canEdit = true,
}: TaskCardProps): React.JSX.Element {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);

  const handleDelete = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    try {
      setIsDeleting(true);
      const res = await deleteTask({ taskId: task.id });
      if (!res.success) {
        sileo.error({
          title: "Error al eliminar tarea",
          description: res.error,
        });
        setIsDeleting(false);
        return;
      }
      sileo.success({
        title: "Tarea eliminada",
        description: `"${task.title}" fue eliminada correctamente.`,
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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>): void => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = (): void => {
    setIsDragging(false);
  };

  const formattedDueDate = (() => {
    try {
      const [year, month, day] = task.dueDate.split("-");
      if (!year || !month || !day) return task.dueDate;
      return `${day}/${month}/${year}`;
    } catch {
      return task.dueDate;
    }
  })();

  const initials = (task.assignee?.name?.[0] ?? task.assignee?.email?.[0] ?? "U").toUpperCase();

  return (
    <>
      <div
        draggable={canEdit}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={() => setIsEditDialogOpen(true)}
        className={cn(
          "group relative flex flex-col gap-2.5 rounded-xl p-3.5 transition-all select-none border cursor-grab active:cursor-grabbing",
          "bg-surface/90 hover:bg-surface border-border hover:border-primary/40 shadow-xs hover:shadow-md",
          isDragging && "opacity-40 scale-[0.98] ring-2 ring-primary border-primary",
          task.isEpic && "border-l-4 border-l-purple-500 bg-purple-500/3"
        )}
      >
        {/* Header: Title & Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs font-semibold text-text-primary leading-snug line-clamp-2">
              {task.title}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditDialogOpen(true);
              }}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Editar tarea"
            >
              <IconPencil className="size-3.5" />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1 rounded-md text-text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Eliminar tarea"
              >
                <IconTrash className="size-3.5" />
              </button>
            )}
            <IconGripVertical className="size-3.5 text-text-muted" />
          </div>
        </div>

        {/* Description snippet if present */}
        {task.description && (
          <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Badges / Tags row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <TaskPriorityBadge priority={task.priority} />

          {task.isMilestone && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <IconDiamond className="size-3" />
              Hito
            </span>
          )}

          {task.isEpic && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <IconCrown className="size-3" />
              Épica
            </span>
          )}

          {task.parent && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-surface-elevated text-text-muted border border-border truncate max-w-32.5">
              <IconFolder className="size-3 shrink-0" />
              <span className="truncate">{task.parent.title}</span>
            </span>
          )}
        </div>

        {/* Footer: Due date & Assignee */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px] text-text-muted">
          <div className="flex items-center gap-1 font-mono text-[10px] text-text-secondary">
            <IconClock className="size-3 shrink-0 text-text-muted" />
            <span>{formattedDueDate}</span>
          </div>

          <div className="flex items-center">
            {task.assignee ? (
              task.assignee.image ? (
                <Image
                  src={task.assignee.image}
                  alt={task.assignee.name ?? "Avatar"}
                  width={20}
                  height={20}
                  unoptimized
                  className="size-5 rounded-full object-cover border border-border"
                />
              ) : (
                <div
                  className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary border border-primary/30"
                  title={task.assignee.name ?? task.assignee.email}
                >
                  {initials}
                </div>
              )
            ) : (
              <div
                className="flex size-5 items-center justify-center rounded-full bg-surface-elevated border border-border text-text-muted"
                title="Sin asignar"
              >
                <IconUser className="size-3 opacity-50" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <TaskFormDialog
        projectId={projectId}
        task={task}
        members={members}
        availableEpics={availableEpics}
        customStatuses={customStatuses}
        customPriorities={customPriorities}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </>
  );
}
