"use client";

import { useState, useRef } from "react";
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
  IconUserOff,
  IconCheck,
  IconFolder,
  IconTrash,
  IconListCheck,
} from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { CompleteTaskConfirmToast } from "./complete-task-confirm-toast";
import { cn } from "@/lib/utils";
import { deleteTask, updateTask, updateTaskStatus } from "../api/task-mutations";
import { sileo } from "sileo";
import {
  isTaskDone,
  toDoneBucket,
  toUndoneBucket,
  type TaskDTO,
  type CustomStatusOption,
  type CustomPriorityOption,
  type TaskAssigneeDTO,
} from "../types/task.types";

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

  // Optimistic Assignee state
  const [currentAssignee, setCurrentAssignee] = useState<TaskAssigneeDTO | null>(task.assignee);
  const [isAssigneePopoverOpen, setIsAssigneePopoverOpen] = useState<boolean>(false);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Optimistic Subtasks overrides
  const [subtaskOverrides, setSubtaskOverrides] = useState<Record<string, string>>({});
  const [taskBucketOverride, setTaskBucketOverride] = useState<string | null>(null);
  const [prevTaskBucket, setPrevTaskBucket] = useState<string>(task.bucket);
  const toastIdRef = useRef<string | null>(null);

  if (task.bucket !== prevTaskBucket) {
    setPrevTaskBucket(task.bucket);
    setTaskBucketOverride(null);
  }

  const currentBucket = taskBucketOverride ?? task.bucket;
  const isDone = isTaskDone(currentBucket);

  const subtasks = (task.subtasks ?? []).map((st) => ({
    ...st,
    bucket: subtaskOverrides[st.id] ?? st.bucket,
  }));

  const completedCount = subtasks.filter((st) => isTaskDone(st.bucket)).length;
  const progressPercent =
    subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  const defaultReopenBucket =
    customStatuses && customStatuses.length > 0
      ? (customStatuses.find((s) => s.id !== "DONE")?.id ?? customStatuses[0].id)
      : "TODO";

  const handleMainTaskCheckClick = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    if (isDone) {
      const undoneBucket = toUndoneBucket(currentBucket, defaultReopenBucket);
      const prevTaskBucketOverride = taskBucketOverride;
      setTaskBucketOverride(undoneBucket);
      try {
        const res = await updateTaskStatus({ taskId: task.id, bucket: undoneBucket });
        if (res.success) {
          sileo.info({
            title: "Tarea reabierta",
            description: `"${task.title}" marcada como sin completar.`,
          });
          router.refresh();
        } else {
          setTaskBucketOverride(prevTaskBucketOverride);
          sileo.error({
            title: "Error al actualizar",
            description: res.error,
          });
        }
      } catch {
        setTaskBucketOverride(prevTaskBucketOverride);
        sileo.error({
          title: "Error al actualizar",
          description: "No se pudo actualizar el estado de la tarea.",
        });
      }
      return;
    }

    // Completing task: check if there are pending subtasks
    const pending = subtasks.filter((s) => !isTaskDone(s.bucket));
    if (pending.length > 0) {
      toastIdRef.current = sileo.action({
        title: "¿Completar subtareas?",
        duration: 15000,
        autopilot: { expand: 40 },
        description: (
          <CompleteTaskConfirmToast
            taskTitle={task.title}
            pendingSubtasksCount={pending.length}
            onCompleteAll={() => {
              if (toastIdRef.current) {
                sileo.dismiss(toastIdRef.current);
                toastIdRef.current = null;
              }
              void handleCompleteTaskAndSubtasks();
            }}
            onCancel={() => {
              if (toastIdRef.current) {
                sileo.dismiss(toastIdRef.current);
                toastIdRef.current = null;
              }
            }}
          />
        ),
      });
      return;
    }

    // No pending subtasks -> complete directly
    await handleCompleteMainTaskOnly();
  };

  const handleCompleteMainTaskOnly = async (): Promise<void> => {
    const prevTaskBucketOverride = taskBucketOverride;
    const doneBucket = toDoneBucket(task.bucket);
    setTaskBucketOverride(doneBucket);
    try {
      const res = await updateTaskStatus({ taskId: task.id, bucket: doneBucket });
      if (res.success) {
        sileo.success({
          title: "Tarea completada",
          description: `"${task.title}" fue marcada como completada.`,
        });
        router.refresh();
      } else {
        setTaskBucketOverride(prevTaskBucketOverride);
        sileo.error({
          title: "Error al completar",
          description: res.error,
        });
      }
    } catch {
      setTaskBucketOverride(prevTaskBucketOverride);
      sileo.error({
        title: "Error al completar",
        description: "No se pudo marcar la tarea como completada.",
      });
    }
  };

  const handleCompleteTaskAndSubtasks = async (): Promise<void> => {
    const pending = subtasks.filter((s) => !isTaskDone(s.bucket));
    const prevTaskBucketOverride = taskBucketOverride;
    const prevSubtaskOverrides = { ...subtaskOverrides };

    const doneBucket = toDoneBucket(task.bucket);
    // Optimistically mark main task and pending subtasks as DONE
    setTaskBucketOverride(doneBucket);
    setSubtaskOverrides((prev) => {
      const next = { ...prev };
      pending.forEach((st) => {
        next[st.id] = toDoneBucket(st.bucket);
      });
      return next;
    });

    try {
      const res = await updateTaskStatus({ taskId: task.id, bucket: doneBucket });
      if (!res.success) {
        setTaskBucketOverride(prevTaskBucketOverride);
        setSubtaskOverrides(prevSubtaskOverrides);
        sileo.error({
          title: "Error al completar tarea",
          description: res.error,
        });
        return;
      }

      await Promise.all(
        pending.map((st) =>
          updateTaskStatus({ taskId: st.id, bucket: toDoneBucket(st.bucket) })
        )
      );

      sileo.success({
        title: "Tarea y subtareas completadas",
        description: `"${task.title}" y sus ${pending.length} subtareas fueron marcadas como completadas.`,
      });
      router.refresh();
    } catch {
      setTaskBucketOverride(prevTaskBucketOverride);
      setSubtaskOverrides(prevSubtaskOverrides);
      sileo.error({
        title: "Error al completar subtareas",
        description: "Ocurrió un error al completar las tareas.",
      });
    }
  };

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

  const handleAssignMember = async (memberId: string | null): Promise<void> => {
    setIsAssigneePopoverOpen(false);
    const prevAssignee = currentAssignee;
    const selectedMember = memberId ? members.find((m) => m.id === memberId) : null;
    const optimisticAssignee: TaskAssigneeDTO | null = selectedMember
      ? {
          id: selectedMember.id,
          name: selectedMember.name,
          email: selectedMember.email,
          image: selectedMember.image ?? null,
        }
      : null;

    setCurrentAssignee(optimisticAssignee);
    setIsAssigning(true);

    try {
      const res = await updateTask({
        taskId: task.id,
        assigneeId: memberId,
      });

      if (!res.success) {
        setCurrentAssignee(prevAssignee);
        sileo.error({
          title: "Error al asignar usuario",
          description: res.error,
        });
        return;
      }
      router.refresh();
    } catch {
      setCurrentAssignee(prevAssignee);
      sileo.error({
        title: "Error al asignar usuario",
        description: "Ocurrió un error inesperado al asignar el usuario.",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleToggleSubtask = async (
    e: React.MouseEvent,
    subtaskId: string,
    currentStatus: string
  ): Promise<void> => {
    e.stopPropagation();
    const isCurrentlyDone = isTaskDone(currentStatus);
    const nextStatus = isCurrentlyDone
      ? toUndoneBucket(currentStatus, "TODO")
      : toDoneBucket(currentStatus);

    setSubtaskOverrides((prev) => ({
      ...prev,
      [subtaskId]: nextStatus,
    }));

    try {
      const res = await updateTaskStatus({
        taskId: subtaskId,
        bucket: nextStatus,
      });

      if (!res.success) {
        setSubtaskOverrides((prev) => ({
          ...prev,
          [subtaskId]: currentStatus,
        }));
        sileo.error({
          title: "Error al actualizar subtarea",
          description: res.error,
        });
        return;
      }

      // Check if all subtasks are now DONE -> auto-complete main task
      const updatedSubtasks = subtasks.map((s) =>
        s.id === subtaskId ? { ...s, bucket: nextStatus } : s
      );
      const allDone =
        updatedSubtasks.length > 0 &&
        updatedSubtasks.every((s) => isTaskDone(s.bucket));

      if (allDone && !isDone) {
        const doneBucket = toDoneBucket(task.bucket);
        setTaskBucketOverride(doneBucket);
        await updateTaskStatus({ taskId: task.id, bucket: doneBucket });
        sileo.success({
          title: "Tarea completada",
          description:
            "Todas las subtareas fueron completadas, por lo que la tarea principal se completó automáticamente.",
        });
      }

      router.refresh();
    } catch {
      setSubtaskOverrides((prev) => ({
        ...prev,
        [subtaskId]: currentStatus,
      }));
      sileo.error({
        title: "Error al actualizar subtarea",
        description: "Ocurrió un error inesperado.",
      });
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

  const initials = (
    currentAssignee?.name?.[0] ??
    currentAssignee?.email?.[0] ??
    "U"
  ).toUpperCase();

  if (isDone) {
    return (
      <>
        <div
          draggable={canEdit}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={() => setIsEditDialogOpen(true)}
          className={cn(
            "group relative flex items-center justify-between gap-2 rounded-xl p-2.5 transition-all select-none border cursor-grab active:cursor-grabbing",
            "bg-surface/50 hover:bg-surface/80 border-border/60 hover:border-primary/40 shadow-2xs hover:shadow-xs opacity-80 hover:opacity-100",
            isDragging && "opacity-40 scale-[0.98] ring-2 ring-primary border-primary",
            task.isEpic && "border-l-4 border-l-purple-500/50"
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              aria-label="Marcar tarea como sin completar"
              onClick={handleMainTaskCheckClick}
              className="size-4 rounded-full border transition-all flex items-center justify-center shrink-0 cursor-pointer bg-primary border-primary text-primary-foreground shadow-xs"
            >
              <IconCheck className="size-2.5 stroke-3" />
            </button>
            <span className="text-xs font-semibold leading-snug truncate transition-all flex-1 line-through text-text-muted">
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
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
              aria-label="Editar tarea"
            >
              <IconPencil className="size-3.5" />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1 rounded-md text-text-muted hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                aria-label="Eliminar tarea"
              >
                <IconTrash className="size-3.5" />
              </button>
            )}
            <IconGripVertical className="size-3.5 text-text-muted" />
          </div>
        </div>

        {isEditDialogOpen && (
          <TaskFormDialog
            projectId={projectId}
            taskToEdit={task}
            members={members}
            availableEpics={availableEpics}
            customStatuses={customStatuses}
            customPriorities={customPriorities}
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            isSubtask={Boolean(task.parentId)}
            parentTitle={task.parent?.title}
            parentStartDate={task.parent?.startDate}
            parentDueDate={task.parent?.dueDate}
          />
        )}
      </>
    );
  }

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
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {/* Round completion check button on hover or persistent if DONE */}
            <button
              type="button"
              aria-label={isDone ? "Marcar como pendiente" : "Completar tarea"}
              onClick={handleMainTaskCheckClick}
              className={cn(
                "mt-0.5 size-4 rounded-full border transition-all flex items-center justify-center shrink-0 cursor-pointer",
                isDone
                  ? "bg-primary border-primary text-primary-foreground shadow-xs opacity-100"
                  : "border-border/80 hover:border-primary/80 hover:bg-primary/20 opacity-0 group-hover:opacity-100"
              )}
            >
              {isDone && <IconCheck className="size-2.5 stroke-3" />}
            </button>
            <span
              className={cn(
                "text-xs font-semibold leading-snug line-clamp-2 transition-all flex-1",
                isDone ? "line-through text-text-muted" : "text-text-primary"
              )}
            >
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
          <TaskPriorityBadge label={task.label} customPriorities={customPriorities} />

          {task.isEpic && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <IconCrown className="size-3" />
              EPIC
            </span>
          )}

          {task.parent && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-surface-elevated text-text-muted border border-border truncate max-w-32.5">
              <IconFolder className="size-3 shrink-0" />
              <span className="truncate">{task.parent.title}</span>
            </span>
          )}
        </div>

        {/* Subtareas: si showSubtasksOnCard es true muestra el checklist interactivo; si es false pero tiene subtareas, muestra barra de progreso */}
        {subtasks.length > 0 && (
          task.showSubtasksOnCard ? (
            /* Modo Checklist interactivo */
            <div
              className="flex flex-col gap-1.5 pt-2 border-t border-border/40"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between text-[10px] text-text-muted font-medium mb-0.5">
                <span>Subtareas</span>
                <span className="font-mono">
                  {completedCount}/{subtasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {subtasks.map((st) => {
                  const isSubtaskDone = isTaskDone(st.bucket);
                  return (
                    <div
                      key={st.id}
                      onClick={(e) => handleToggleSubtask(e, st.id, st.bucket)}
                      className="flex items-center gap-2 group/st py-1 px-1.5 rounded-md hover:bg-surface-elevated/70 transition-colors cursor-pointer select-none"
                    >
                      <button
                        type="button"
                        aria-label={
                          isSubtaskDone
                            ? "Marcar subtarea como sin completar"
                            : "Marcar subtarea como completada"
                        }
                        className={cn(
                          "size-3.5 shrink-0 rounded-full flex items-center justify-center border transition-all cursor-pointer",
                          isSubtaskDone
                            ? "bg-primary border-primary text-primary-foreground shadow-2xs"
                            : "border-border hover:border-primary/60 bg-surface"
                        )}
                      >
                        {isSubtaskDone && <IconCheck className="size-2.5 stroke-3" />}
                      </button>
                      <span
                        className={cn(
                          "text-[11px] leading-tight truncate flex-1 transition-all",
                          isSubtaskDone
                            ? "line-through text-text-muted"
                            : "text-text-primary group-hover/st:text-text-primary"
                        )}
                      >
                        {st.title}
                      </span>
                      {st.assignee && (
                        <span className="shrink-0 text-[9px] text-text-muted">
                          {st.assignee.image ? (
                            <Image
                              src={st.assignee.image}
                              alt={st.assignee.name ?? "Avatar"}
                              width={14}
                              height={14}
                              unoptimized
                              className="size-3.5 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <span className="flex size-3.5 items-center justify-center rounded-full bg-primary/20 text-[8px] font-bold text-primary">
                              {(st.assignee.name?.[0] ?? "U").toUpperCase()}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Modo Barra de progreso cuando el switch NO está activado */
            <div
              className="flex flex-col gap-1.5 pt-2 border-t border-border/40"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between text-[10px] text-text-muted font-medium">
                <span className="flex items-center gap-1">
                  <IconListCheck className="size-3 text-text-muted" />
                  <span>Subtareas</span>
                </span>
                <span className="font-mono">
                  {completedCount}/{subtasks.length} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden border border-border/40">
                <div
                  className={cn(
                    "h-full transition-all duration-300 rounded-full",
                    progressPercent === 100 ? "bg-emerald-400" : "bg-primary"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )
        )}

        {/* Footer: Due date & Assignee */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px] text-text-muted">
          <div className="flex items-center gap-1 font-mono text-[10px] text-text-secondary">
            <IconClock className="size-3 shrink-0 text-text-muted" />
            <span>{formattedDueDate}</span>
          </div>

          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            <Popover open={isAssigneePopoverOpen} onOpenChange={setIsAssigneePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={!canEdit || isAssigning}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform hover:scale-110 cursor-pointer"
                  aria-label="Asignar usuario"
                  title={
                    currentAssignee
                      ? `Asignado a: ${currentAssignee.name ?? currentAssignee.email}`
                      : "Asignar usuario"
                  }
                >
                  {currentAssignee ? (
                    currentAssignee.image ? (
                      <Image
                        src={currentAssignee.image}
                        alt={currentAssignee.name ?? "Avatar"}
                        width={20}
                        height={20}
                        unoptimized
                        className="size-5 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary border border-primary/30">
                        {initials}
                      </div>
                    )
                  ) : (
                    <div className="flex size-5 items-center justify-center rounded-full bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-text-muted transition-colors">
                      <IconUser className="size-3 opacity-60" />
                    </div>
                  )}
                </button>
              </PopoverTrigger>

              <PopoverContent align="end" className="w-56 p-2 rounded-xl shadow-xl">
                <div className="text-[11px] font-semibold text-text-muted px-2 py-1 mb-1 border-b border-border/50">
                  Asignar a
                </div>
                <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => void handleAssignMember(null)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left text-xs transition-colors hover:bg-surface-elevated cursor-pointer",
                      !currentAssignee && "bg-surface-elevated text-primary font-medium"
                    )}
                  >
                    <div className="flex size-5 items-center justify-center rounded-full bg-surface-elevated border border-border text-text-muted">
                      <IconUserOff className="size-3 opacity-60" />
                    </div>
                    <span className="flex-1 truncate">Sin asignar</span>
                    {!currentAssignee && <IconCheck className="size-3.5 text-primary shrink-0" />}
                  </button>

                  {members.map((member) => {
                    const isSelected = currentAssignee?.id === member.id;
                    const mInitials = (member.name?.[0] ?? member.email[0] ?? "U").toUpperCase();
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => void handleAssignMember(member.id)}
                        className={cn(
                          "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left text-xs transition-colors hover:bg-surface-elevated cursor-pointer",
                          isSelected && "bg-surface-elevated text-primary font-medium"
                        )}
                      >
                        {member.image ? (
                          <Image
                            src={member.image}
                            alt={member.name ?? "Avatar"}
                            width={20}
                            height={20}
                            unoptimized
                            className="size-5 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                            {mInitials}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate leading-tight font-medium text-text-primary">
                            {member.name || member.email}
                          </span>
                          {member.name && (
                            <span className="text-[10px] text-text-muted truncate leading-tight">
                              {member.email}
                            </span>
                          )}
                        </div>
                        {isSelected && <IconCheck className="size-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
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
        isSubtask={Boolean(task.parentId)}
        parentTitle={task.parent?.title}
        parentStartDate={task.parent?.startDate}
        parentDueDate={task.parent?.dueDate}
        onTaskCreatedOrUpdated={() => {
          setSubtaskOverrides({});
          router.refresh();
        }}
      />
    </>
  );
}
