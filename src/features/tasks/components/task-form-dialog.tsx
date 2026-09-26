"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { DatePicker } from "@/shared/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/lib/utils";
import { TaskStatusPriorityConfigDialog } from "./task-status-priority-config-dialog";
import { TaskCommentsPanel } from "./task-comments-panel";
import {
  createTask,
  updateTask,
  getSubtasks,
  createSubtask,
  deleteSubtask,
} from "../api/task-mutations";
import {
  IconSettings,
  IconCrown,
  IconDiamond,
  IconCheck,
  IconLoader2,
  IconX,
} from "@tabler/icons-react";
import { sileo } from "sileo";
import type {
  TaskDTO,
  SubtaskDTO,
  CustomStatusOption,
  CustomPriorityOption,
  UpdateTaskInput,
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
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayString(): string {
  return formatLocalDate(new Date());
}

function getOneWeekLaterString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return formatLocalDate(d);
}

const fallbackStatuses: CustomStatusOption[] = [
  { id: "TODO", label: "Por Hacer" },
  { id: "IN_PROGRESS", label: "En Progreso" },
  { id: "IN_REVIEW", label: "En Revisión" },
  { id: "DONE", label: "Completada" },
  { id: "CANCELLED", label: "Cancelada" },
];

const fallbackPriorities: CustomPriorityOption[] = [
  { id: "LOW", label: "Baja" },
  { id: "MEDIUM", label: "Media" },
  { id: "HIGH", label: "Alta" },
  { id: "URGENT", label: "Urgente" },
];

interface TaskFormContentProps {
  readonly projectId: string;
  readonly initialTask?: TaskDTO;
  readonly defaultStatus?: string;
  readonly members: readonly ProjectMemberOption[];
  readonly availableEpics: readonly TaskEpicOption[];
  readonly priorities: readonly CustomPriorityOption[];
  readonly onOpenConfig: () => void;
  readonly onTaskCreatedOrUpdated?: (task: TaskDTO) => void;
}

function TaskFormContent({
  projectId,
  initialTask,
  defaultStatus,
  members,
  availableEpics,
  priorities,
  onOpenConfig,
  onTaskCreatedOrUpdated,
}: TaskFormContentProps): React.JSX.Element {
  const router = useRouter();
  const [currentTask, setCurrentTask] = useState<TaskDTO | undefined>(initialTask);

  // Form State initialized directly from initialTask
  const [title, setTitle] = useState<string>(initialTask?.title ?? "");
  const [assigneeId, setAssigneeId] = useState<string>(initialTask?.assigneeId ?? "");
  const [startDate, setStartDate] = useState<string>(initialTask?.startDate ?? getTodayString());
  const [dueDate, setDueDate] = useState<string>(initialTask?.dueDate ?? getOneWeekLaterString());
  const [predecessors, setPredecessors] = useState<string>(initialTask?.predecessors ?? "");
  const [isEpic, setIsEpic] = useState<boolean>(initialTask?.isEpic ?? false);
  const [isMilestone, setIsMilestone] = useState<boolean>(initialTask?.isMilestone ?? false);
  const [parentId, setParentId] = useState<string>(initialTask?.parentId ?? "");
  const status = initialTask?.status ?? defaultStatus ?? "TODO";
  const [priority, setPriority] = useState<string>(initialTask?.priority ?? "MEDIUM");
  const [description, setDescription] = useState<string>(initialTask?.description ?? "");

  // Auto-save feedback
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCreatingRef = useRef<boolean>(false);

  // Subtasks state
  const [subtasks, setSubtasks] = useState<SubtaskDTO[]>([]);
  const [activeTab, setActiveTab] = useState<"description" | "subtasks">("description");
  const [isAddingSubtask, setIsAddingSubtask] = useState<boolean>(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string>("");
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState<string>("");
  const [isSavingSubtask, setIsSavingSubtask] = useState<boolean>(false);

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

  const handleAddSubtask = async (): Promise<void> => {
    if (!newSubtaskTitle.trim() || !currentTask?.id) return;
    setIsSavingSubtask(true);
    try {
      const res = await createSubtask({
        parentId: currentTask.id,
        projectId,
        title: newSubtaskTitle.trim(),
        assigneeId: newSubtaskAssigneeId || null,
      });
      if (res.success && res.data) {
        setSubtasks((prev) => [...prev, res.data]);
        setNewSubtaskTitle("");
        setNewSubtaskAssigneeId("");
        setIsAddingSubtask(false);
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
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    await deleteSubtask(subtaskId, projectId);
    router.refresh();
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
            status: (updates.status ?? status) || defaultStatus || "TODO",
            priority: (updates.priority ?? priority) || "MEDIUM",
            startDate: updates.startDate ?? startDate,
            dueDate: updates.dueDate ?? dueDate,
            isEpic: updates.isEpic ?? isEpic,
            isMilestone: updates.isMilestone ?? isMilestone,
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
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 1800);
          router.refresh();
        } else {
          setSaveState("error");
        }
      } catch {
        setSaveState("error");
      }
    },
    [
      currentTask?.id,
      title,
      projectId,
      status,
      defaultStatus,
      priority,
      startDate,
      dueDate,
      isEpic,
      isMilestone,
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
          {/* Tarea Maestra (EPIC) */}
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
            <Select
              value={priority}
              onValueChange={(val) => {
                setPriority(val);
                triggerImmediateSave({ priority: val });
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-text-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((pr) => (
                  <SelectItem key={pr.id} value={pr.id}>
                    {pr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fila 2: Fecha de inicio (Izquierda) y Fecha de fin (Derecha) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-start" className="text-xs font-semibold text-text-primary">
              Fecha de inicio *
            </label>
            <DatePicker
              id="task-start"
              value={startDate}
              onChange={(newStart) => {
                setStartDate(newStart);
                triggerImmediateSave({ startDate: newStart });
              }}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-due" className="text-xs font-semibold text-text-primary">
              Fecha de fin *
            </label>
            <DatePicker
              id="task-due"
              value={dueDate}
              onChange={(newDue) => {
                setDueDate(newDue);
                triggerImmediateSave({ dueDate: newDue });
              }}
              required
            />
          </div>
        </div>

        {/* Fila 3: Predecesoras y Hito */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-predecessors" className="text-xs font-semibold text-text-primary">
              Predecesoras
            </label>
            <Input
              id="task-predecessors"
              type="text"
              placeholder="ej. Tarea 1..."
              value={predecessors}
              onChange={(e) => {
                const next = e.target.value;
                setPredecessors(next);
                queueDebouncedSave({ predecessors: next.trim() || null });
              }}
              onBlur={() => {
                triggerImmediateSave({ predecessors: predecessors.trim() || null });
              }}
              maxLength={500}
              className="border-border bg-background text-xs rounded-xl h-9"
            />
          </div>

          <div className="flex flex-col justify-between gap-1.5 rounded-xl border border-border/80 bg-background/50 p-2.5">
            <div className="flex items-center gap-1.5">
              <IconDiamond className="size-4 text-amber-500" />
              <span className="text-xs font-semibold text-text-primary">Hito</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-muted">Punto clave</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMilestone}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setIsMilestone(next);
                    triggerImmediateSave({ isMilestone: next });
                  }}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>
          </div>
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
                activeTab === "description"
                  ? "rounded-t-lg border border-b-0 border-border bg-surface text-text-primary font-semibold"
                  : "text-text-muted hover:text-text-primary font-medium"
              )}
            >
              Descripción
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("subtasks")}
              className={cn(
                "px-4 py-2 text-xs transition-colors cursor-pointer -mb-px flex items-center gap-1.5",
                activeTab === "subtasks"
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
          </div>

          {/* Tab 1: Descripción */}
          {activeTab === "description" && (
            <div className="pt-3 flex-1 flex flex-col min-h-0">
              <textarea
                id="task-description"
                placeholder="Agrega una descripción detallada o notas..."
                value={description}
                onChange={(e) => {
                  const next = e.target.value;
                  setDescription(next);
                  queueDebouncedSave({ description: next.trim() || null });
                }}
                onBlur={() => {
                  triggerImmediateSave({ description: description.trim() || null });
                }}
                maxLength={2000}
                className="w-full flex-1 min-h-48 rounded-xl border border-border bg-background p-3.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Tab 2: Subtareas (matching attached image) */}
          {activeTab === "subtasks" && (
            <div className="flex flex-col pt-1">
              {/* Header de columnas */}
              <div className="grid grid-cols-12 px-3 py-2 text-xs font-semibold text-text-primary border-b border-border/60">
                <div className="col-span-7 sm:col-span-8">Título</div>
                <div className="col-span-5 sm:col-span-4">Personas asignadas</div>
              </div>

              {/* Lista de subtareas existentes */}
              <div className="flex flex-col divide-y divide-border/40">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="grid grid-cols-12 items-center px-3 py-2 text-xs hover:bg-surface-elevated/40 transition-colors group"
                  >
                    <div className="col-span-7 sm:col-span-8 flex items-center gap-2 truncate pr-2">
                      <span className="text-text-primary truncate">{st.title}</span>
                    </div>
                    <div className="col-span-5 sm:col-span-4 flex items-center justify-between">
                      <span className="text-text-secondary truncate text-[11px]">
                        {st.assignee?.name || st.assignee?.email || "Sin asignar"}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSubtask(st.id)}
                        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger p-1 rounded transition-opacity cursor-pointer"
                        title="Eliminar subtarea"
                      >
                        <IconX className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Inline Add Row */}
                {isAddingSubtask ? (
                  <div className="grid grid-cols-12 items-center gap-2 px-3 py-2 bg-surface-elevated/20">
                    <div className="col-span-7 sm:col-span-8">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Título de la subtarea..."
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleAddSubtask();
                          } else if (e.key === "Escape") {
                            setIsAddingSubtask(false);
                            setNewSubtaskTitle("");
                          }
                        }}
                        className="w-full text-xs bg-background border border-primary/50 rounded-lg px-2.5 py-1 text-text-primary focus:outline-none"
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-4 flex items-center gap-1.5">
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
                        onClick={() => void handleAddSubtask()}
                        disabled={isSavingSubtask || !newSubtaskTitle.trim()}
                        className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                        title="Guardar"
                      >
                        <IconCheck className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSubtask(false);
                          setNewSubtaskTitle("");
                        }}
                        className="p-1 rounded text-text-muted hover:text-text-primary cursor-pointer"
                        title="Cancelar"
                      >
                        <IconX className="size-3.5" />
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
}: TaskFormDialogProps): React.JSX.Element {
  const initialTask = taskAlias ?? taskToEdit;
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
        <DialogContent className="border-border bg-surface w-[95vw] sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl min-h-[85vh] max-h-[94vh] overflow-y-auto p-6 sm:p-8 flex flex-col">
          {isOpen && (
            <TaskFormContent
              key={initialTask?.id ?? "new-task"}
              projectId={projectId}
              initialTask={initialTask}
              defaultStatus={defaultStatus}
              members={members}
              availableEpics={availableEpics}
              priorities={priorities}
              onOpenConfig={() => setIsConfigOpen(true)}
              onTaskCreatedOrUpdated={onTaskCreatedOrUpdated}
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
