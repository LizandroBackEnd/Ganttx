"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { TaskStatusPriorityConfigDialog } from "./task-status-priority-config-dialog";
import { createTask, updateTask, deleteTask } from "../api/task-mutations";
import { IconSettings, IconCrown, IconTrash } from "@tabler/icons-react";
import { sileo } from "sileo";
import type { TaskDTO, CustomStatusOption, CustomPriorityOption } from "../types/task.types";

export interface ProjectMemberOption {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
}

export interface TaskEpicOption {
  readonly id: string;
  readonly title: string;
  readonly customId: string | null;
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

function calculateDuration(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 1;
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
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
}: TaskFormDialogProps): React.JSX.Element {
  const activeTask = taskAlias ?? taskToEdit;
  const router = useRouter();
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

  // 1. ID / Clave
  const [customId, setCustomId] = useState<string>(activeTask?.customId ?? "");
  // 2. Actividad / Título
  const [title, setTitle] = useState<string>(activeTask?.title ?? "");
  // 3. Requerimiento
  const [requirement, setRequirement] = useState<string>(activeTask?.requirement ?? "");
  // 4. Sprint
  const [sprint, setSprint] = useState<string>(activeTask?.sprint ?? "");
  // 5. Asignado
  const [assigneeId, setAssigneeId] = useState<string>(activeTask?.assigneeId ?? "");
  // 6, 7, 8. Fechas & Duración
  const [startDate, setStartDate] = useState<string>(activeTask?.startDate ?? getTodayString());
  const [dueDate, setDueDate] = useState<string>(activeTask?.dueDate ?? getOneWeekLaterString());
  const [durationDays, setDurationDays] = useState<number>(
    activeTask?.durationDays ?? calculateDuration(activeTask?.startDate ?? getTodayString(), activeTask?.dueDate ?? getOneWeekLaterString())
  );
  // 9. Predecesoras
  const [predecessors, setPredecessors] = useState<string>(activeTask?.predecessors ?? "");
  // EPICs
  const [isEpic, setIsEpic] = useState<boolean>(activeTask?.isEpic ?? false);
  const [parentId, setParentId] = useState<string>(activeTask?.parentId ?? "");
  // Status & Priority
  const [status, setStatus] = useState<string>(activeTask?.status ?? defaultStatus ?? "TODO");
  const [priority, setPriority] = useState<string>(activeTask?.priority ?? "MEDIUM");
  const [description, setDescription] = useState<string>(activeTask?.description ?? "");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteTask = async (): Promise<void> => {
    if (!activeTask) return;

    try {
      setIsDeleting(true);
      const res = await deleteTask({ taskId: activeTask.id });
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
        description: `"${activeTask.title}" fue eliminada correctamente.`,
      });
      setOpen(false);
      router.refresh();
    } catch {
      sileo.error({
        title: "Error al eliminar tarea",
        description: "Ocurrió un error inesperado al eliminar la tarea.",
      });
      setIsDeleting(false);
    }
  };

  // Auto-recalculate duration when dates change
  const handleStartDateChange = (newStart: string): void => {
    setStartDate(newStart);
    setDurationDays(calculateDuration(newStart, dueDate));
  };

  const handleDueDateChange = (newDue: string): void => {
    setDueDate(newDue);
    setDurationDays(calculateDuration(startDate, newDue));
  };

  const handleDurationChange = (days: number): void => {
    setDurationDays(days);
    if (startDate && days > 0) {
      const d = new Date(`${startDate}T00:00:00`);
      d.setDate(d.getDate() + (days - 1));
      setDueDate(formatLocalDate(d));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!title.trim()) {
      setError("La actividad o nombre de la tarea es obligatorio");
      return;
    }
    if (dueDate < startDate) {
      setError("La fecha de fin no puede ser anterior a la de inicio");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (activeTask) {
        const res = await updateTask({
          taskId: activeTask.id,
          customId: customId.trim() || null,
          title: title.trim(),
          description: description.trim() || null,
          requirement: requirement.trim() || null,
          sprint: sprint.trim() || null,
          durationDays,
          priority,
          status,
          startDate,
          dueDate,
          predecessors: predecessors.trim() || null,
          isEpic,
          parentId: isEpic ? null : parentId || null,
          assigneeId: assigneeId || null,
        });

        if (!res.success) {
          setError(res.error);
          sileo.error({
            title: "Error al actualizar tarea",
            description: res.error,
          });
          setIsLoading(false);
          return;
        }

        sileo.success({
          title: "Tarea actualizada",
          description: `"${title.trim()}" se guardó correctamente.`,
        });
      } else {
        const res = await createTask({
          projectId,
          customId: customId.trim() || undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          requirement: requirement.trim() || undefined,
          sprint: sprint.trim() || undefined,
          durationDays,
          priority,
          status,
          startDate,
          dueDate,
          predecessors: predecessors.trim() || undefined,
          isEpic,
          parentId: isEpic ? undefined : parentId || undefined,
          assigneeId: assigneeId || undefined,
        });

        if (!res.success) {
          setError(res.error);
          sileo.error({
            title: "Error al crear tarea",
            description: res.error,
          });
          setIsLoading(false);
          return;
        }

        sileo.success({
          title: "Tarea creada",
          description: `"${title.trim()}" se agregó al proyecto.`,
        });
      }

      setOpen(false);
      if (!activeTask) {
        setCustomId("");
        setTitle("");
        setRequirement("");
        setSprint("");
        setDescription("");
        setPredecessors("");
        setIsEpic(false);
        setParentId("");
      }
      router.refresh();
    } catch {
      const msg = "Ocurrió un error inesperado al guardar la tarea";
      setError(msg);
      sileo.error({
        title: "Error al guardar tarea",
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="border-border bg-surface sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold text-text-primary">
                    {taskToEdit ? "Editar Tarea" : "Crear Nueva Tarea"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-text-secondary mt-0.5">
                    {taskToEdit
                      ? "Actualiza las propiedades, fechas y dependencias de la tarea."
                      : "Registra una nueva actividad en el cronograma de trabajo."}
                  </DialogDescription>
                </div>

                {/* Epic indicator */}
                {isEpic && (
                  <div className="flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
                    <IconCrown className="size-3.5" />
                    <span>Tarea EPIC</span>
                  </div>
                )}
              </div>
            </DialogHeader>

            <div className="my-5 flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {error}
                </div>
              )}

              {/* 1. ID & 2. Actividad */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1.5 sm:col-span-1">
                  <label htmlFor="task-custom-id" className="text-xs font-semibold text-text-primary">
                    1. ID
                  </label>
                  <Input
                    id="task-custom-id"
                    type="text"
                    placeholder="ej. T1.1, CU01"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    disabled={isLoading}
                    maxLength={50}
                    className="border-border bg-background text-xs font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-3">
                  <label htmlFor="task-title" className="text-xs font-semibold text-text-primary">
                    2. Actividad *
                  </label>
                  <Input
                    id="task-title"
                    type="text"
                    placeholder="ej. Configuración del entorno, Especificar CU"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isLoading}
                    required
                    maxLength={255}
                    className="border-border bg-background text-xs"
                  />
                </div>
              </div>

              {/* 3. Requerimiento & 4. Sprint */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-req" className="text-xs font-semibold text-text-primary">
                    3. Requerimiento
                  </label>
                  <Input
                    id="task-req"
                    type="text"
                    placeholder="ej. RF01, RNF02, RF04"
                    value={requirement}
                    onChange={(e) => setRequirement(e.target.value)}
                    disabled={isLoading}
                    maxLength={50}
                    className="border-border bg-background text-xs font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-sprint" className="text-xs font-semibold text-text-primary">
                    4. Sprint
                  </label>
                  <Input
                    id="task-sprint"
                    type="text"
                    placeholder="ej. 1, 2, 3 o Sprint 1"
                    value={sprint}
                    onChange={(e) => setSprint(e.target.value)}
                    disabled={isLoading}
                    maxLength={50}
                    className="border-border bg-background text-xs"
                  />
                </div>
              </div>

              {/* 5. Asignado */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-assignee" className="text-xs font-semibold text-text-primary">
                  5. Asignado
                </label>
                <select
                  id="task-assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={isLoading}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="">Sin asignar / Todo el equipo</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name ? `${m.name} (${m.email})` : m.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Duración, 7. Inicio, 8. Fin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-start" className="text-xs font-semibold text-text-primary">
                    7. Inicio *
                  </label>
                  <DatePicker
                    id="task-start"
                    value={startDate}
                    onChange={handleStartDateChange}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-due" className="text-xs font-semibold text-text-primary">
                    8. Fin *
                  </label>
                  <DatePicker
                    id="task-due"
                    value={dueDate}
                    onChange={handleDueDateChange}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-duration" className="text-xs font-semibold text-text-primary">
                    6. Duración (días)
                  </label>
                  <Input
                    id="task-duration"
                    type="number"
                    min={1}
                    max={365}
                    value={durationDays}
                    onChange={(e) => handleDurationChange(Math.max(1, Number(e.target.value) || 1))}
                    disabled={isLoading}
                    className="border-border bg-background text-xs font-mono"
                  />
                </div>
              </div>

              {/* 9. Predecesoras */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-predecessors" className="text-xs font-semibold text-text-primary">
                  9. Predecesoras
                </label>
                <Input
                  id="task-predecessors"
                  type="text"
                  placeholder="ej. T1.1, T1.3, CU01"
                  value={predecessors}
                  onChange={(e) => setPredecessors(e.target.value)}
                  disabled={isLoading}
                  maxLength={500}
                  className="border-border bg-background text-xs font-mono"
                />
              </div>

              {/* EPIC / Jerarquía Maestra */}
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5 flex flex-col gap-3">
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
                      onChange={(e) => setIsEpic(e.target.checked)}
                      disabled={isLoading}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-surface-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>

                {!isEpic && availableEpics.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-purple-500/20">
                    <label htmlFor="task-epic-parent" className="text-xs font-medium text-text-secondary">
                      Pertenece al EPIC:
                    </label>
                    <select
                      id="task-epic-parent"
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      disabled={isLoading}
                      className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-text-primary focus:border-purple-400 focus:outline-none"
                    >
                      <option value="">Ninguno (Tarea independiente)</option>
                      {availableEpics
                        .filter((ep) => !taskToEdit || ep.id !== taskToEdit.id)
                        .map((ep) => (
                          <option key={ep.id} value={ep.id}>
                            {ep.customId ? `[${ep.customId}] ` : ""}{ep.title}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Estado y Prioridad con Botón de Ajustes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="task-status" className="text-xs font-semibold text-text-primary">
                      Estado
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsConfigOpen(true)}
                      className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <IconSettings className="size-3" />
                      <span>Personalizar</span>
                    </button>
                  </div>
                  <select
                    id="task-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={isLoading}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-text-primary focus:border-primary focus:outline-none"
                  >
                    {statuses.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="task-priority" className="text-xs font-semibold text-text-primary">
                      Prioridad
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsConfigOpen(true)}
                      className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <IconSettings className="size-3" />
                      <span>Personalizar</span>
                    </button>
                  </div>
                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    disabled={isLoading}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-text-primary focus:border-primary focus:outline-none"
                  >
                    {priorities.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripción opcional */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-description" className="text-xs font-semibold text-text-primary">
                  Descripción / Criterios de Aceptación (opcional)
                </label>
                <textarea
                  id="task-description"
                  rows={2}
                  placeholder="Detalles adicionales, checklist o notas..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  maxLength={2000}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t border-border/40 pt-4">
              <div>
                {activeTask && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteTask}
                    disabled={isLoading || isDeleting}
                    className="gap-1.5"
                  >
                    <IconTrash className="size-4" />
                    <span>{isDeleting ? "Eliminando..." : "Eliminar Tarea"}</span>
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={isLoading || isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  disabled={isLoading || isDeleting}
                  className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
                >
                  {isLoading ? "Guardando..." : activeTask ? "Actualizar Tarea" : "Crear Tarea"}
                </Button>
              </div>
            </DialogFooter>
          </form>
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
