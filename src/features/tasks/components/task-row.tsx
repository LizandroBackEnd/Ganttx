"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskStatusBadge } from "./task-status-badge";
import { TaskPriorityBadge } from "./task-priority-badge";
import { TaskFormDialog, type ProjectMemberOption } from "./task-form-dialog";
import { updateTaskStatus, deleteTask } from "../api/task-mutations";
import { IconCheck, IconPencil, IconTrash } from "@tabler/icons-react";
import type { TaskDTO } from "../types/task.types";
import type { TaskStatus } from "@/lib/constants";

export interface TaskRowProps {
  readonly task: TaskDTO;
  readonly members?: readonly ProjectMemberOption[];
  readonly canEdit?: boolean;
}

export function TaskRow({
  task,
  members = [],
  canEdit = true,
}: TaskRowProps): React.JSX.Element {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleStatusChange = async (newStatus: TaskStatus): Promise<void> => {
    try {
      await updateTaskStatus({ taskId: task.id, status: newStatus });
      router.refresh();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) {
      return;
    }
    try {
      setIsDeleting(true);
      await deleteTask({ taskId: task.id });
      router.refresh();
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="group flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 bg-surface/50 px-4 py-3.5 transition-colors hover:bg-surface">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Quick status toggle */}
          <button
            type="button"
            onClick={() => handleStatusChange(task.status === "DONE" ? "TODO" : "DONE")}
            aria-label={task.status === "DONE" ? "Mark incomplete" : "Mark complete"}
            className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
              task.status === "DONE"
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                : "border-border hover:border-primary"
            }`}
          >
            {task.status === "DONE" && (
              <IconCheck className="size-3.5 stroke-3" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`truncate text-sm font-medium text-text-primary ${
                  task.status === "DONE" ? "line-through text-text-muted" : ""
                }`}
              >
                {task.title}
              </span>
              <TaskPriorityBadge priority={task.priority} />
            </div>

            {task.description && (
              <p className="truncate text-xs text-text-secondary mt-0.5">
                {task.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto text-xs text-text-muted">
          {/* Progress bar */}
          <div className="hidden sm:flex items-center gap-1.5 w-20">
            <div className="h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-text-secondary w-6 text-right">
              {task.progress}%
            </span>
          </div>

          <TaskStatusBadge status={task.status} />

          <span className="font-mono text-[11px] text-text-secondary">
            {task.startDate} → {task.dueDate}
          </span>

          {task.assignee ? (
            <span
              title={task.assignee.name ?? task.assignee.email}
              className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary"
            >
              {(task.assignee.name?.[0] ?? task.assignee.email[0])?.toUpperCase()}
            </span>
          ) : (
            <span className="text-[11px] text-text-muted italic">Unassigned</span>
          )}

          {canEdit && (
            <div className="flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => setIsEditDialogOpen(true)}
                className="rounded p-1 text-text-muted hover:bg-surface-elevated hover:text-text-primary"
                title="Edit task"
              >
                <IconPencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded p-1 text-text-muted hover:bg-destructive/20 hover:text-destructive"
                title="Delete task"
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
          taskToEdit={task}
          isOpenControlled={isEditDialogOpen}
          onOpenChangeControlled={setIsEditDialogOpen}
        />
      )}
    </>
  );
}
