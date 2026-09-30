"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { DatePicker } from "@/shared/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/lib/utils";
import { TaskStatusPriorityConfigDialog } from "./task-status-priority-config-dialog";
import { TaskCommentsPanel } from "./task-comments-panel";
import { TaskPriorityBadge, parseTaskLabels } from "./task-priority-badge";
import { TaskLabelSelector } from "./task-label-selector";
import { TaskPredecessorsSelector } from "./task-predecessors-selector";
import { TaskMarkdownEditor } from "./task-markdown-editor";
import {
  createTask,
  updateTask,
  updateTaskStatus,
  getSubtasks,
  createSubtask,
  deleteSubtask,
  getTaskDetails,
} from "../api/task-mutations";
import {
  IconSettings,
  IconCrown,
  IconCheck,
  IconLoader2,
  IconX,
  IconExternalLink,
  IconLayoutKanban,
} from "@tabler/icons-react";
import { sileo } from "sileo";
import {
  isTaskDone,
  toDoneBucket,
  toUndoneBucket,
  type TaskDTO,
  type SubtaskDTO,
  type CustomStatusOption,
  type CustomPriorityOption,
  type UpdateTaskInput,
} from "../types/task.types";

export interface ProjectMemberOption {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
  readonly image?: string | null;
}

export interface TaskEpicOption {
  readonly id: string;
  readonly title: string;
}

export interface TaskFormDialogProps {
  readonly projectId: string;
  readonly members?: readonly ProjectMemberOption[];
  readonly availableEpics?: readonly TaskEpicOption[];
  readonly customStatuses?: readonly CustomStatusOption[] | null;
  readonly customPriorities?: readonly CustomPriorityOption[] | null;
  readonly taskToEdit?: TaskDTO;
  readonly task?: TaskDTO;
  readonly defaultStatus?: string;
  readonly trigger?: React.ReactNode;
  readonly isOpenControlled?: boolean;
  readonly onOpenChangeControlled?: (open: boolean) => void;
  readonly isOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onTaskCreatedOrUpdated?: (task: TaskDTO) => void;
  readonly isSubtask?: boolean;
  readonly parentTitle?: string;
  readonly parentStartDate?: string | null;
  readonly parentDueDate?: string | null;
  readonly availableTasks?: readonly TaskDTO[];
}


const fallbackStatuses: CustomStatusOption[] = [
  { id: "TODO", label: "Por Hacer" },
  { id: "IN_PROGRESS", label: "En Progreso" },
  { id: "IN_REVIEW", label: "En Revisión" },
  { id: "DONE", label: "Completada" },
  { id: "CANCELLED", label: "Cancelada" },
];

const fallbackPriorities: CustomPriorityOption[] = [
  { id: "LOW", label: "Baja", color: "#0284c7" },
  { id: "MEDIUM", label: "Media", color: "#eab308" },
  { id: "HIGH", label: "Alta", color: "#f97316" },
  { id: "URGENT", label: "Urgente", color: "#ef4444" },
];

interface TaskFormContentProps {
  readonly projectId: string;
  readonly initialTask?: TaskDTO;
  readonly defaultStatus?: string;
  readonly members: readonly ProjectMemberOption[];
  readonly availableEpics: readonly TaskEpicOption[];
  readonly priorities: readonly CustomPriorityOption[];
  readonly customStatuses?: readonly CustomStatusOption[] | null;
  readonly customPriorities?: readonly CustomPriorityOption[] | null;
  readonly onOpenConfig: () => void;
  readonly onTaskCreatedOrUpdated?: (task: TaskDTO) => void;
  readonly isSubtask?: boolean;
  readonly parentTitle?: string;
  readonly parentStartDate?: string | null;
  readonly parentDueDate?: string | null;
  readonly availableTasks?: readonly TaskDTO[];
}

function TaskFormContent({
  projectId,
  initialTask,
  defaultStatus,
  members,
  availableEpics,
  priorities,
  customStatuses,
  onOpenConfig,
  onTaskCreatedOrUpdated,
  isSubtask: isSubtaskProp,
  parentTitle,
  parentStartDate,
  parentDueDate,
  availableTasks,
}: TaskFormContentProps): React.JSX.Element {
  const router = useRouter();
  const [currentTask, setCurrentTask] = useState<TaskDTO | undefined>(initialTask);

  const isSubtask = Boolean(
    isSubtaskProp || initialTask?.parentId || currentTask?.parentId
  );
  const effectiveParentTitle =
    parentTitle || initialTask?.parent?.title || currentTask?.parent?.title;
  const effectiveParentStartDate =
    parentStartDate || initialTask?.parent?.startDate || currentTask?.parent?.startDate;
  const effectiveParentDueDate =
    parentDueDate || initialTask?.parent?.dueDate || currentTask?.parent?.dueDate;

  // Form State initialized directly from initialTask
  const [title, setTitle] = useState<string>(initialTask?.title ?? "");
  const [assigneeId, setAssigneeId] = useState<string>(initialTask?.assigneeId ?? "");
  const [startDate, setStartDate] = useState<string>(initialTask?.startDate ?? "");
  const [dueDate, setDueDate] = useState<string>(initialTask?.dueDate ?? "");
  const [predecessors, setPredecessors] = useState<string>(initialTask?.predecessors ?? "");
  const [isEpic, setIsEpic] = useState<boolean>(isSubtask ? false : (initialTask?.isEpic ?? false));
  const [parentId, setParentId] = useState<string>(initialTask?.parentId ?? "");
  const bucket = initialTask?.bucket ?? defaultStatus ?? "TODO";
  const [label, setLabel] = useState<string>(initialTask?.label ?? "MEDIUM");
  const currentLabels = useMemo(() => parseTaskLabels(label), [label]);

  const handleLabelsChange = (newLabels: string[]): void => {
    const nextVal = newLabels.join(",");
    setLabel(nextVal);
    triggerImmediateSave({ label: nextVal });
  };
  const [description, setDescription] = useState<string>(initialTask?.description ?? "");
  const [showSubtasksOnCard, setShowSubtasksOnCard] = useState<boolean>(
    initialTask?.showSubtasksOnCard ?? false
  );

  // Auto-save feedback
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCreatingRef = useRef<boolean>(false);

  // Subtasks state
  const [subtasks, setSubtasks] = useState<SubtaskDTO[]>([]);
  const [activeTab, setActiveTab] = useState<"description" | "subtasks">("description");
  const currentActiveTab = isSubtask ? "description" : activeTab;
  const [isAddingSubtask, setIsAddingSubtask] = useState<boolean>(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string>("");
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState<string>("");
  const [newSubtaskLabels, setNewSubtaskLabels] = useState<string[]>([]);
  const [isSavingSubtask, setIsSavingSubtask] = useState<boolean>(false);


  // Subtask modal state
  const [subtaskModalTask, setSubtaskModalTask] = useState<TaskDTO | null>(null);
  const [isLoadingSubtaskModal, setIsLoadingSubtaskModal] = useState<boolean>(false);

  // Load subtasks when task is present
  useEffect(() => {
    if (!currentTask?.id) return;
    let isCancelled = false;
    getSubtasks(currentTask.id).then((res) => {
      if (!isCancelled && res.success && res.data) {
        setSubtasks(res.data);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [currentTask?.id]);

  const handleOpenSubtaskModal = async (subtaskId: string): Promise<void> => {
    setIsLoadingSubtaskModal(true);
    try {
      const res = await getTaskDetails(subtaskId);
      if (res.success && res.data) {
        setSubtaskModalTask(res.data);
      } else {
        sileo.error({
          title: "Error al cargar la subtarea",
          description: !res.success ? res.error : "No se pudo encontrar la subtarea",
        });
      }
    } catch {
      sileo.error({
        title: "Error inesperado",
        description: "No se pudo abrir el detalle de la subtarea.",
      });
    } finally {
      setIsLoadingSubtaskModal(false);
    }
  };

  const handleCreateAndOpenSubtaskModal = async (): Promise<void> => {
    if (!currentTask?.id) {
      sileo.info({
        title: "Primero escribe un título",
        description: "Ingresa el nombre de la tarea para poder añadirle subtareas.",
      });
      return;
    }

    const titleToUse = newSubtaskTitle.trim() || "Nueva subtarea";
    const labelToUse =
      newSubtaskLabels.length > 0
        ? newSubtaskLabels.join(",")
        : (label || priorities[0]?.id || "MEDIUM");
    setIsSavingSubtask(true);
    try {
      const res = await createSubtask({
        parentId: currentTask.id,
        projectId,
        title: titleToUse,
        assigneeId: newSubtaskAssigneeId || null,
        label: labelToUse,
      });

      if (res.success && res.data) {
        const nextSubtasks = [...subtasks, res.data];
        setSubtasks(nextSubtasks);
        setNewSubtaskTitle("");
        setNewSubtaskAssigneeId("");
        setNewSubtaskLabels([]);
        setIsAddingSubtask(false);
        onTaskCreatedOrUpdated?.({
          ...(currentTask ?? initialTask!),
          subtasks: nextSubtasks,
          subtasksCount: nextSubtasks.length,
        });
        router.refresh();
        await handleOpenSubtaskModal(res.data.id);
      } else {
        const errorMsg = !res.success ? res.error : "No se pudo crear la subtarea";
        sileo.error({
          title: "Error al crear subtarea",
          description: errorMsg,
        });
      }
    } catch {
      sileo.error({
        title: "Error al crear subtarea",
        description: "Ocurrió un error inesperado.",
      });
    } finally {
      setIsSavingSubtask(false);
    }
  };

  const handleAddSubtask = async (): Promise<void> => {
    if (!newSubtaskTitle.trim() || !currentTask?.id) return;
    const labelToUse =
      newSubtaskLabels.length > 0
        ? newSubtaskLabels.join(",")
        : (label || priorities[0]?.id || "MEDIUM");
    setIsSavingSubtask(true);
    try {
      const res = await createSubtask({
        parentId: currentTask.id,
        projectId,
        title: newSubtaskTitle.trim(),
        assigneeId: newSubtaskAssigneeId || null,
        label: labelToUse,
      });
      if (res.success && res.data) {
        const nextSubtasks = [...subtasks, res.data];
        setSubtasks(nextSubtasks);
        setNewSubtaskTitle("");
        setNewSubtaskAssigneeId("");
        setNewSubtaskLabels([]);
        setIsAddingSubtask(false);
        onTaskCreatedOrUpdated?.({
          ...(currentTask ?? initialTask!),
          subtasks: nextSubtasks,
          subtasksCount: nextSubtasks.length,
        });
        router.refresh();
      } else {
        const errorMsg = !res.success ? res.error : "No se pudo crear la subtarea";
        sileo.error({
          title: "Error al crear subtarea",
          description: errorMsg,
        });
      }
    } catch {
      sileo.error({
        title: "Error al crear subtarea",
        description: "Ocurrió un error inesperado.",
      });
    } finally {
      setIsSavingSubtask(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string): Promise<void> => {
    const nextSubtasks = subtasks.filter((s) => s.id !== subtaskId);
    setSubtasks(nextSubtasks);
    onTaskCreatedOrUpdated?.({
      ...(currentTask ?? initialTask!),
      subtasks: nextSubtasks,
      subtasksCount: nextSubtasks.length,
    });
    await deleteSubtask(subtaskId, projectId);
    router.refresh();
  };

  const handleToggleSubtaskCompletion = async (
    subtaskId: string,
    currentStatus: string
  ): Promise<void> => {
    const isCurrentlyDone = isTaskDone(currentStatus);
    const nextStatus = isCurrentlyDone
      ? toUndoneBucket(currentStatus, "TODO")
      : toDoneBucket(currentStatus);
    const updated = subtasks.map((s) =>
      s.id === subtaskId ? { ...s, bucket: nextStatus } : s
    );
    setSubtasks(updated);

    try {
      const res = await updateTaskStatus({
        taskId: subtaskId,
        bucket: nextStatus,
      });

      if (!res.success) {
        setSubtasks(subtasks);
        sileo.error({
          title: "Error al actualizar subtarea",
          description: res.error,
        });
        return;
      }

      // Si todas las subtareas están completadas en automático la tarea principal también se debe completar
      const allCompleted =
        updated.length > 0 && updated.every((s) => isTaskDone(s.bucket));

      if (allCompleted && currentTask?.id && !isTaskDone(bucket)) {
        const doneBucket = toDoneBucket(currentTask.bucket ?? bucket);
        await updateTaskStatus({
          taskId: currentTask.id,
          bucket: doneBucket,
        });
        const updatedTaskDto = {
          ...(currentTask ?? initialTask!),
          bucket: doneBucket,
          subtasks: updated,
          subtasksCount: updated.length,
        };
        setCurrentTask(updatedTaskDto);
        onTaskCreatedOrUpdated?.(updatedTaskDto);
        sileo.success({
          title: "Tarea completada",
          description:
            "Todas las subtareas fueron completadas, por lo que la tarea principal se marcó como completada.",
        });
      } else {
        onTaskCreatedOrUpdated?.({
          ...(currentTask ?? initialTask!),
          subtasks: updated,
          subtasksCount: updated.length,
        });
      }

      router.refresh();
    } catch {
      setSubtasks(subtasks);
      sileo.error({
        title: "Error al actualizar subtarea",
        description: "Ocurrió un error inesperado.",
      });
    }
  };

  const handleToggleShowAsCardInBuckets = (checked: boolean): void => {
    setShowSubtasksOnCard(checked);
    triggerImmediateSave({ showSubtasksOnCard: checked });
    const updatedDto = {
      ...(currentTask ?? initialTask!),
      showSubtasksOnCard: checked,
    } as TaskDTO;
    setCurrentTask(updatedDto);
    onTaskCreatedOrUpdated?.(updatedDto);
    if (checked) {
      sileo.success({
        title: "Tarjeta en buckets activada",
        description: `"${title.trim() || "La subtarea"}" ahora se muestra como una tarjeta en los buckets.`,
      });
    } else {
      sileo.info({
        title: "Tarjeta en buckets desactivada",
        description: `"${title.trim() || "La subtarea"}" ya no se muestra como tarjeta en el tablero.`,
      });
    }
    router.refresh();
  };

  const handleToggleSubtaskCardVisibility = async (
    subtaskId: string,
    currentVisibility: boolean
  ): Promise<void> => {
    const nextVisibility = !currentVisibility;
    try {
      const res = await updateTask({
        taskId: subtaskId,
        showSubtasksOnCard: nextVisibility,
      });

      if (res.success) {
        const nextSubtasks = subtasks.map((s) =>
          s.id === subtaskId ? { ...s, showSubtasksOnCard: nextVisibility } : s
        );
        setSubtasks(nextSubtasks);
        onTaskCreatedOrUpdated?.({
          ...(currentTask ?? initialTask!),
          subtasks: nextSubtasks,
        });

        if (nextVisibility) {
          sileo.success({
            title: "Tarjeta en buckets activada",
            description: "La subtarea ahora se muestra como una tarjeta en el tablero.",
          });
        } else {
          sileo.info({
            title: "Tarjeta en buckets desactivada",
            description: "La subtarea ya no se muestra como tarjeta en el tablero.",
          });
        }
        router.refresh();
      } else {
        sileo.error({
          title: "Error al actualizar subtarea",
          description: res.error,
        });
      }
    } catch {
      sileo.error({
        title: "Error al actualizar subtarea",
        description: "No se pudo actualizar la visibilidad en el tablero.",
      });
    }
  };

  // Send update or create on server
  const persistChanges = useCallback(
    async (updates: Partial<UpdateTaskInput>): Promise<void> => {
      const activeId = currentTask?.id;

      if (!activeId) {
        // Create initial task if not yet created
        const candidateTitle = (updates.title ?? title).trim();
        if (!candidateTitle || isCreatingRef.current) return;

        isCreatingRef.current = true;
        setSaveState("saving");

        try {
          const res = await createTask({
            projectId,
            title: candidateTitle,
            bucket: (updates.bucket ?? bucket) || defaultStatus || "TODO",
            label: (updates.label ?? label) || "MEDIUM",
            startDate: updates.startDate !== undefined ? (updates.startDate || null) : (startDate || null),
            dueDate: updates.dueDate !== undefined ? (updates.dueDate || null) : (dueDate || null),
            isEpic: updates.isEpic ?? isEpic,
            showSubtasksOnCard: updates.showSubtasksOnCard ?? showSubtasksOnCard,
            parentId: updates.parentId !== undefined ? updates.parentId : parentId || undefined,
            assigneeId: updates.assigneeId !== undefined ? updates.assigneeId : assigneeId || undefined,
            description: updates.description !== undefined ? updates.description : description.trim() || undefined,
          });

          if (res.success && res.data) {
            setCurrentTask(res.data);
            onTaskCreatedOrUpdated?.(res.data);
            setSaveState("saved");
            setTimeout(() => setSaveState("idle"), 1800);
            router.refresh();
          } else {
            setSaveState("error");
          }
        } catch {
          setSaveState("error");
        } finally {
          isCreatingRef.current = false;
        }
        return;
      }

      setSaveState("saving");
      try {
        const res = await updateTask({
          taskId: activeId,
          ...updates,
        });

        if (res.success) {
          const updatedDto = {
            ...(currentTask ?? initialTask),
            ...updates,
            startDate:
              updates.startDate !== undefined
                ? (updates.startDate || null)
                : ((currentTask ?? initialTask)?.startDate ?? null),
            dueDate:
              updates.dueDate !== undefined
                ? (updates.dueDate || null)
                : ((currentTask ?? initialTask)?.dueDate ?? null),
          } as TaskDTO;
          setCurrentTask(updatedDto);
          onTaskCreatedOrUpdated?.(updatedDto);
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1800);
          router.refresh();
        } else {
          setSaveState("error");
          sileo.error({
            title: "Error al guardar",
            description: res.error,
          });
        }
      } catch {
        setSaveState("error");
      }
    },
    [
      currentTask,
      initialTask,
      title,
      projectId,
      bucket,
      defaultStatus,
      label,
      startDate,
      dueDate,
      isEpic,
      showSubtasksOnCard,
      parentId,
      assigneeId,
      description,
      onTaskCreatedOrUpdated,
      router,
    ]
  );

  const queueDebouncedSave = useCallback(
    (updates: Partial<UpdateTaskInput>): void => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setSaveState("saving");
      debounceTimerRef.current = setTimeout(() => {
        void persistChanges(updates);
      }, 450);
    },
    [persistChanges]
  );

  const triggerImmediateSave = useCallback(
    (updates: Partial<UpdateTaskInput>): void => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      void persistChanges(updates);
    },
    [persistChanges]
  );

  const handleToggleShowSubtasksOnCard = (checked: boolean): void => {
    setShowSubtasksOnCard(checked);
    triggerImmediateSave({ showSubtasksOnCard: checked });
  };

  return (
    <>
      <DialogHeader className="border-b border-border/60 pb-3">
        <div className="flex items-center justify-between gap-3">
          {/* Editable Title in Header */}
          <div className="min-w-0 flex-1">
            <DialogTitle className="sr-only">Editar Tarea</DialogTitle>
            <DialogDescription className="sr-only">Detalles de la tarea</DialogDescription>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                const next = e.target.value;
                setTitle(next);
                queueDebouncedSave({ title: next.trim() });
              }}
              onBlur={() => {
                if (title.trim()) {
                  triggerImmediateSave({ title: title.trim() });
                }
              }}
              placeholder="Nombre de la tarea..."
              className="w-full text-lg font-bold text-text-primary bg-transparent border-0 border-b border-transparent hover:border-border/60 focus:border-primary focus:outline-none py-0.5 px-0 transition-colors placeholder:text-text-muted"
            />
          </div>

          {/* Auto-save Feedback Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            {saveState === "saving" && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-medium">
                <IconLoader2 className="size-3 animate-spin" />
                <span>Guardando...</span>
              </div>
            )}
            {saveState === "saved" && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-medium">
                <IconCheck className="size-3 stroke-3" />
                <span>Guardado</span>
              </div>
            )}
            {saveState === "error" && (
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-medium">
                <span>Error al guardar</span>
              </div>
            )}
          </div>
        </div>
      </DialogHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-5 flex-1">
        {/* Columna Izquierda: Formulario principal de la tarea */}
        <div className="lg:col-span-7 flex flex-col gap-4 h-full">
          {/* Si es una subtarea, muestra a qué tarea pertenece y el switch para mostrarla como tarjeta en los buckets. En caso contrario, muestra la sección de EPIC */}
          {isSubtask ? (
            <div className="rounded-xl border border-border/60 bg-surface-elevated/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full shrink-0">
                  Subtarea
                </span>
                <span className="text-xs text-text-muted shrink-0">Pertenece a la tarea:</span>
                <span className="text-xs font-semibold text-text-primary truncate">
                  {effectiveParentTitle || "Tarea principal"}
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto bg-surface/60 border border-border/60 rounded-xl px-3 py-1.5">
                <IconLayoutKanban className="size-4 text-primary" />
                <span className="text-xs text-text-secondary font-medium select-none">
                  Hacer tarjeta en los buckets
                </span>
                <Switch
                  checked={showSubtasksOnCard}
                  onCheckedChange={handleToggleShowAsCardInBuckets}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconCrown className="size-4 text-purple-400" />
                  <span className="text-xs font-semibold text-text-primary">
                    Tarea Maestra (EPIC)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEpic}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setIsEpic(next);
                      if (next) setParentId("");
                      triggerImmediateSave({ isEpic: next, parentId: null });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-purple-600" />
                </label>
              </div>

              {!isEpic && availableEpics.length > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t border-purple-500/15">
                  <span className="text-[11px] text-text-secondary shrink-0">Pertenece al EPIC:</span>
                  <Select
                    value={parentId || "NONE"}
                    onValueChange={(val) => {
                      const next = val === "NONE" ? "" : val;
                      setParentId(next);
                      triggerImmediateSave({ parentId: next || null });
                    }}
                  >
                    <SelectTrigger className="h-8 w-full rounded-xl border border-border bg-background px-2.5 text-xs text-text-primary focus:border-purple-400">
                      <SelectValue placeholder="Ninguno (Tarea independiente)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Ninguno (Tarea independiente)</SelectItem>
                      {availableEpics
                        .filter((ep) => !currentTask || ep.id !== currentTask.id)
                        .map((ep) => (
                          <SelectItem key={ep.id} value={ep.id}>
                            {ep.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

        {/* Fila 1: Asignado (Izquierda) y Etiquetas (Derecha) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-primary">
              Asignado
            </label>
            <Select
              value={assigneeId || "UNASSIGNED"}
              onValueChange={(val) => {
                const next = val === "UNASSIGNED" ? "" : val;
                setAssigneeId(next);
                triggerImmediateSave({ assigneeId: next || null });
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-text-primary">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNASSIGNED">Sin asignar</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name ? `${m.name} (${m.email})` : m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary">
                Etiquetas
              </label>
              <button
                type="button"
                onClick={onOpenConfig}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
              >
                <IconSettings className="size-3" />
                <span>Personalizar</span>
              </button>
            </div>
            <TaskLabelSelector
              selectedLabels={currentLabels}
              onChange={handleLabelsChange}
              priorities={priorities}
              onOpenConfig={onOpenConfig}
            />
          </div>
        </div>

        {/* Fila 2: Fecha de inicio (Izquierda) y Fecha de fin (Derecha) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-start" className="text-xs font-semibold text-text-primary">
              Fecha de inicio
            </label>
            <DatePicker
              id="task-start"
              value={startDate}
              placeholder=""
              minDate={isSubtask ? effectiveParentStartDate || undefined : undefined}
              maxDate={isSubtask ? (effectiveParentDueDate || dueDate || undefined) : (dueDate || undefined)}
              onChange={(newStart) => {
                if (!newStart) {
                  setStartDate("");
                  triggerImmediateSave({ startDate: null });
                  return;
                }
                if (isSubtask && effectiveParentStartDate && newStart < effectiveParentStartDate) {
                  sileo.error({
                    title: "Fecha de inicio no permitida",
                    description: `Una subtarea no puede iniciar antes que la tarea principal (${effectiveParentStartDate}). Puede iniciar el mismo día o después.`,
                  });
                  return;
                }
                if (isSubtask && effectiveParentDueDate && newStart > effectiveParentDueDate) {
                  sileo.error({
                    title: "Fecha de inicio no permitida",
                    description: `Una subtarea no puede iniciar después del límite de la tarea principal (${effectiveParentDueDate}).`,
                  });
                  return;
                }
                if (dueDate && newStart > dueDate) {
                  setDueDate(newStart);
                  triggerImmediateSave({ startDate: newStart, dueDate: newStart });
                } else {
                  triggerImmediateSave({ startDate: newStart });
                }
                setStartDate(newStart);
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-due" className="text-xs font-semibold text-text-primary">
              Fecha de fin
            </label>
            <DatePicker
              id="task-due"
              value={dueDate}
              placeholder=""
              minDate={startDate || (isSubtask ? effectiveParentStartDate || undefined : undefined)}
              maxDate={isSubtask ? effectiveParentDueDate || undefined : undefined}
              onChange={(newDue) => {
                if (!newDue) {
                  setDueDate("");
                  triggerImmediateSave({ dueDate: null });
                  return;
                }
                if (isSubtask && effectiveParentDueDate && newDue > effectiveParentDueDate) {
                  sileo.error({
                    title: "Fecha de fin no permitida",
                    description: `Una subtarea no puede terminar después de la tarea principal (${effectiveParentDueDate}). Puede terminar el mismo día o antes.`,
                  });
                  return;
                }
                if (startDate && newDue < startDate) {
                  sileo.error({
                    title: "Fecha de fin no permitida",
                    description: "La fecha de fin no puede ser anterior a la fecha de inicio.",
                  });
                  return;
                }
                setDueDate(newDue);
                triggerImmediateSave({ dueDate: newDue });
              }}
            />
          </div>
        </div>

        {/* Fila 3: Predecesoras */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-primary flex items-center justify-between">
            <span>Predecesoras</span>
            <span className="text-[10px] font-normal text-text-muted">
              Tareas que deben completarse antes
            </span>
          </label>
          <TaskPredecessorsSelector
            projectId={projectId}
            currentTaskId={currentTask?.id || initialTask?.id}
            value={predecessors}
            onChange={(next) => {
              setPredecessors(next ?? "");
              triggerImmediateSave({ predecessors: next });
            }}
            availableTasks={availableTasks}
            customStatuses={customStatuses}
            customPriorities={priorities}
          />
        </div>

        {/* Fila 4: Tabs de Descripción y Subtareas */}
        <div className="flex flex-col pt-2 border-t border-border/40 flex-1 min-h-0">
          {/* Tab Navigation matching image */}
          <div className="flex items-center gap-1 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("description")}
              className={cn(
                "px-4 py-2 text-xs transition-colors cursor-pointer -mb-px",
                currentActiveTab === "description"
                  ? "rounded-t-lg border border-b-0 border-border bg-surface text-text-primary font-semibold"
                  : "text-text-muted hover:text-text-primary font-medium"
              )}
            >
              Descripción
            </button>
            {!isSubtask && (
              <button
                type="button"
                onClick={() => setActiveTab("subtasks")}
                className={cn(
                  "px-4 py-2 text-xs transition-colors cursor-pointer -mb-px flex items-center gap-1.5",
                  currentActiveTab === "subtasks"
                    ? "rounded-t-lg border border-b-0 border-border bg-surface text-text-primary font-semibold"
                    : "text-text-muted hover:text-text-primary font-medium"
                )}
              >
                <span>Subtareas</span>
                {subtasks.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                    {subtasks.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Tab 1: Descripción con Markdown enriquecido y Storage */}
          {currentActiveTab === "description" && (
            <div className="pt-3 flex-1 flex flex-col min-h-0">
              <TaskMarkdownEditor
                value={description}
                onChange={(next) => {
                  setDescription(next);
                  queueDebouncedSave({ description: next.trim() || null });
                }}
                onBlur={() => {
                  triggerImmediateSave({ description: description.trim() || null });
                }}
                placeholder="Escribe una descripción detallada en Markdown... Tip: Arrastra imágenes o documentos aquí, o pega capturas con Ctrl + V"
              />
            </div>
          )}

          {/* Tab 2: Subtareas (matching attached image) */}
          {!isSubtask && currentActiveTab === "subtasks" && (
            <div className="flex flex-col pt-1">
              {/* Switch para mostrar checklist en la tarjeta */}
              <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl bg-surface-elevated/40 border border-border/50">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-text-primary">
                    Mostrar checklist en la tarjeta
                  </span>
                  <span className="text-[11px] text-text-muted">
                    Habilita la lista de verificación interactiva directamente en la tarjeta de la tarea
                  </span>
                </div>
                <Switch
                  checked={showSubtasksOnCard}
                  onCheckedChange={handleToggleShowSubtasksOnCard}
                  aria-label="Mostrar checklist en la tarjeta"
                />
              </div>

              {/* Header de columnas */}
              <div className="grid grid-cols-12 px-3 py-2 text-xs font-semibold text-text-primary border-b border-border/60">
                <div className="col-span-5 sm:col-span-5">Título</div>
                <div className="col-span-3 sm:col-span-3">Etiqueta</div>
                <div className="col-span-4 sm:col-span-4">Personas asignadas</div>
              </div>

              {/* Lista de subtareas existentes */}
              <div className="flex flex-col divide-y divide-border/40">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="grid grid-cols-12 items-center px-3 py-2 text-xs hover:bg-surface-elevated/40 transition-colors group"
                  >
                    <div className="col-span-5 sm:col-span-5 flex items-center gap-2.5 truncate pr-2">
                      <button
                        type="button"
                        aria-label={isTaskDone(st.bucket) ? "Marcar como pendiente" : "Marcar como completada"}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleToggleSubtaskCompletion(st.id, st.bucket);
                        }}
                        className={cn(
                          "size-4 shrink-0 rounded-full flex items-center justify-center border transition-all cursor-pointer",
                          isTaskDone(st.bucket)
                            ? "bg-primary border-primary text-primary-foreground shadow-xs"
                            : "border-border hover:border-primary/60 bg-surface"
                        )}
                      >
                        {isTaskDone(st.bucket) && <IconCheck className="size-2.5 stroke-3" />}
                      </button>
                      <span
                        onClick={() => void handleOpenSubtaskModal(st.id)}
                        className={cn(
                          "truncate hover:text-primary transition-colors font-medium cursor-pointer flex-1",
                          isTaskDone(st.bucket) && "line-through text-text-muted"
                        )}
                      >
                        {st.title}
                      </span>
                    </div>
                    <div className="col-span-3 sm:col-span-3 flex flex-wrap items-center gap-1">
                      <TaskPriorityBadge
                        label={st.label}
                        customPriorities={priorities}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-4 flex items-center justify-between">
                      <span className="text-text-secondary truncate text-[11px]">
                        {st.assignee?.name || st.assignee?.email || "Sin asignar"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleToggleSubtaskCardVisibility(st.id, Boolean(st.showSubtasksOnCard))}
                          className={cn(
                            "p-1 rounded-md transition-all cursor-pointer",
                            st.showSubtasksOnCard
                              ? "text-primary bg-primary/10 border border-primary/25 opacity-100"
                              : "opacity-0 group-hover:opacity-100 text-text-muted hover:text-primary hover:bg-surface-elevated"
                          )}
                          title={
                            st.showSubtasksOnCard
                              ? "Mostrada como tarjeta en los buckets (clic para ocultar del tablero)"
                              : "Hacer tarjeta en los buckets (mostrar en el tablero)"
                          }
                        >
                          <IconLayoutKanban className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleOpenSubtaskModal(st.id)}
                          disabled={isLoadingSubtaskModal}
                          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-primary p-1 rounded-md hover:bg-surface-elevated transition-all cursor-pointer"
                          title="Abrir detalles de la subtarea"
                        >
                          <IconExternalLink className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSubtask(st.id)}
                          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger p-1 rounded-md hover:bg-surface-elevated transition-all cursor-pointer"
                          title="Eliminar subtarea"
                        >
                          <IconX className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Inline Add Row */}
                {isAddingSubtask ? (
                  <div className="grid grid-cols-12 items-center gap-2 px-3 py-2 bg-surface-elevated/20">
                    <div className="col-span-5 sm:col-span-5">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Título de la subtarea (Enter para agregar)..."
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleAddSubtask();
                          } else if (e.key === "Escape") {
                            setIsAddingSubtask(false);
                            setNewSubtaskTitle("");
                            setNewSubtaskAssigneeId("");
                            setNewSubtaskLabels([]);
                          }
                        }}
                        className="w-full text-xs bg-background border border-primary/50 rounded-lg px-2.5 py-1 text-text-primary focus:outline-none"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-3">
                      <TaskLabelSelector
                        compact
                        selectedLabels={newSubtaskLabels}
                        onChange={setNewSubtaskLabels}
                        priorities={priorities}
                        placeholder="Etiqueta"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-4 flex items-center gap-1.5">
                      <div className="flex-1 min-w-0">
                        <Select
                          value={newSubtaskAssigneeId || "UNASSIGNED"}
                          onValueChange={(val) => {
                            setNewSubtaskAssigneeId(val === "UNASSIGNED" ? "" : val);
                          }}
                        >
                          <SelectTrigger className="h-7 w-full rounded-lg border border-border bg-background px-2 text-[11px] text-text-primary">
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNASSIGNED">Sin asignar</SelectItem>
                            {members.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name || m.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCreateAndOpenSubtaskModal()}
                        disabled={isSavingSubtask}
                        className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                        title="Abrir detalles en modal"
                      >
                        {isSavingSubtask ? (
                          <IconLoader2 className="size-3.5 animate-spin" />
                        ) : (
                          <IconExternalLink className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Botón "Agregar una línea" exactamente como la imagen */
                  <div className="px-3 py-2 border-b border-border/40">
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentTask?.id) {
                          sileo.info({
                            title: "Primero escribe un título",
                            description: "Ingresa el nombre de la tarea para poder añadirle subtareas.",
                          });
                          return;
                        }
                        setIsAddingSubtask(true);
                      }}
                      className="text-xs text-sky-500 hover:text-sky-400 font-normal cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <span>Agregar una subtarea</span>
                    </button>
                  </div>
                )}

                {/* Líneas vacías de división estilo cuadrícula como en la imagen */}
                <div className="h-7 border-b border-border/30" />
                <div className="h-7 border-b border-border/30" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Columna Derecha: Panel Lateral de Comentarios */}
      <div className="lg:col-span-5 flex flex-col border-t lg:border-t-0 lg:border-l border-border/60 pt-6 lg:pt-0 lg:pl-8 h-full">
        <TaskCommentsPanel
          taskId={currentTask?.id}
          projectId={projectId}
          task={currentTask}
          members={members}
        />
      </div>
    </div>

    {/* Subtask Modal */}
    {subtaskModalTask && (
      <TaskFormDialog
        projectId={projectId}
        members={members}
        availableEpics={availableEpics}
        customStatuses={customStatuses}
        customPriorities={priorities}
        taskToEdit={subtaskModalTask}
        isOpenControlled={Boolean(subtaskModalTask)}
        isSubtask
        parentTitle={currentTask?.title || initialTask?.title || parentTitle}
        parentStartDate={currentTask?.startDate || initialTask?.startDate || parentStartDate}
        parentDueDate={currentTask?.dueDate || initialTask?.dueDate || parentDueDate}
        onOpenChangeControlled={(open) => {
          if (!open) {
            setSubtaskModalTask(null);
            if (currentTask?.id) {
              void getSubtasks(currentTask.id).then((res) => {
                if (res.success && res.data) {
                  setSubtasks(res.data);
                }
              });
            }
          }
        }}
        onTaskCreatedOrUpdated={(updatedTask) => {
          setSubtasks((prev) =>
            prev.map((s) =>
              s.id === updatedTask.id
                ? {
                    ...s,
                    title: updatedTask.title,
                    bucket: updatedTask.bucket,
                    label: updatedTask.label,
                    assigneeId: updatedTask.assigneeId,
                    assignee: updatedTask.assignee,
                    showSubtasksOnCard: updatedTask.showSubtasksOnCard,
                  }
                : s
            )
          );
        }}
      />
    )}
  </>
);
}

export function TaskFormDialog({
  projectId,
  members = [],
  availableEpics = [],
  customStatuses = fallbackStatuses,
  customPriorities = fallbackPriorities,
  taskToEdit,
  task: taskAlias,
  defaultStatus,
  trigger,
  isOpenControlled,
  onOpenChangeControlled,
  isOpen: isOpenAlias,
  onOpenChange: onOpenChangeAlias,
  onTaskCreatedOrUpdated,
  isSubtask: isSubtaskProp,
  parentTitle: parentTitleProp,
  parentStartDate: parentStartDateProp,
  parentDueDate: parentDueDateProp,
  availableTasks,
}: TaskFormDialogProps): React.JSX.Element {
  const initialTask = taskAlias ?? taskToEdit;
  const isSubtask = Boolean(isSubtaskProp || initialTask?.parentId);
  const parentTitle = parentTitleProp || initialTask?.parent?.title;
  const parentStartDate = parentStartDateProp || initialTask?.parent?.startDate;
  const parentDueDate = parentDueDateProp || initialTask?.parent?.dueDate;
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const effectiveIsOpen = isOpenAlias !== undefined ? isOpenAlias : isOpenControlled;
  const effectiveOnOpenChange = onOpenChangeAlias !== undefined ? onOpenChangeAlias : onOpenChangeControlled;
  const isControlled = effectiveIsOpen !== undefined;
  const isOpen = isControlled ? effectiveIsOpen : internalOpen;
  const setOpen = isControlled
    ? (open: boolean) => effectiveOnOpenChange?.(open)
    : setInternalOpen;

  const [statuses, setStatuses] = useState<CustomStatusOption[]>(
    customStatuses && customStatuses.length > 0 ? [...customStatuses] : fallbackStatuses
  );
  const [priorities, setPriorities] = useState<CustomPriorityOption[]>(
    customPriorities && customPriorities.length > 0 ? [...customPriorities] : fallbackPriorities
  );
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent
          overlayClassName={isSubtask ? "z-55" : undefined}
          className={cn(
            "border-border bg-surface w-[95vw] sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl min-h-[85vh] max-h-[94vh] overflow-y-auto p-6 sm:p-8 flex flex-col",
            isSubtask && "z-60"
          )}
        >
          {isOpen && (
            <TaskFormContent
              key={initialTask?.id ?? "new-task"}
              projectId={projectId}
              initialTask={initialTask}
              defaultStatus={defaultStatus}
              members={members}
              availableEpics={availableEpics}
              priorities={priorities}
              customStatuses={statuses}
              customPriorities={priorities}
              onOpenConfig={() => setIsConfigOpen(true)}
              onTaskCreatedOrUpdated={onTaskCreatedOrUpdated}
              isSubtask={isSubtask}
              parentTitle={parentTitle}
              parentStartDate={parentStartDate}
              parentDueDate={parentDueDate}
              availableTasks={availableTasks}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog for Custom Status & Priority */}
      <TaskStatusPriorityConfigDialog
        projectId={projectId}
        isOpen={isConfigOpen}
        onOpenChange={setIsConfigOpen}
        currentStatuses={statuses}
        currentPriorities={priorities}
        onSaved={(newStatuses, newPriorities) => {
          setStatuses(newStatuses);
          setPriorities(newPriorities);
        }}
      />
    </>
  );
}
