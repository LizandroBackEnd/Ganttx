"use client";

import { useState, useMemo, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { TaskBucketColumn } from "./task-bucket-column";
import { TaskTable } from "./task-table";
import { TaskFormDialog, type ProjectMemberOption, type TaskEpicOption } from "./task-form-dialog";
import { TaskStatusPriorityConfigDialog } from "./task-status-priority-config-dialog";
import { parseTaskLabels } from "./task-priority-badge";
import {
  DeleteBucketConfirmToast,
  SKIP_BUCKET_DELETE_KEY,
} from "./delete-bucket-confirm-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  IconPlus,
  IconSearch,
  IconLayoutKanban,
  IconTable,
  IconAdjustmentsHorizontal,
  IconX,
} from "@tabler/icons-react";
import { sileo } from "sileo";
import { updateTaskStatus, updateProjectCustomOptions } from "../api/task-mutations";
import {
  getProjectBuckets,
  type TaskDTO,
  type BucketOption,
  type CustomStatusOption,
  type CustomPriorityOption,
} from "../types/task.types";
import { cn } from "@/lib/utils";

export interface TaskBoardProps {
  readonly projectId: string;
  readonly tasks: readonly TaskDTO[];
  readonly members?: readonly ProjectMemberOption[];
  readonly availableEpics?: readonly TaskEpicOption[];
  readonly customStatuses?: readonly CustomStatusOption[] | null;
  readonly customPriorities?: readonly CustomPriorityOption[] | null;
  readonly canEdit?: boolean;
}

export function TaskBoard({
  projectId,
  tasks,
  members = [],
  availableEpics = [],
  customStatuses,
  customPriorities,
  canEdit = true,
}: TaskBoardProps): React.JSX.Element {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // View mode: "board" (Kanban) or "table" (List)
  const [viewFormat, setViewFormat] = useState<"board" | "table">("board");

  // React 19 Optimistic tasks state
  const [optimisticTasks, setOptimisticTaskStatus] = useOptimistic(
    [...tasks],
    (current: TaskDTO[], update: { taskId: string; targetBucketId: string }) =>
      current.map((t) =>
        t.id === update.taskId ? { ...t, bucket: update.targetBucketId } : t
      )
  );

  // Buckets derived from project customStatuses with React 19 Optimistic state
  const baseBuckets = useMemo<BucketOption[]>(
    () => getProjectBuckets(customStatuses),
    [customStatuses]
  );

  const [buckets, setOptimisticBuckets] = useOptimistic(
    baseBuckets,
    (_current: BucketOption[], next: BucketOption[]) => next
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");

  // Dialogs
  const [isNewTaskOpen, setIsNewTaskOpen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isNewBucketOpen, setIsNewBucketOpen] = useState<boolean>(false);
  const [newBucketLabel, setNewBucketLabel] = useState<string>("");
  const [newBucketColor, setNewBucketColor] = useState<string>("#0ea5e9");
  const [isSavingBucket, setIsSavingBucket] = useState<boolean>(false);
  const [bucketError, setBucketError] = useState<string | null>(null);

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return optimisticTasks.filter((task) => {
      const matchesSearch =
        !searchQuery.trim() ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAssignee =
        selectedAssignee === "ALL" ||
        (selectedAssignee === "UNASSIGNED"
          ? !task.assigneeId
          : task.assigneeId === selectedAssignee);

      const matchesPriority =
        selectedPriority === "ALL" ||
        task.label === selectedPriority ||
        parseTaskLabels(task.label).includes(selectedPriority);

      return matchesSearch && matchesAssignee && matchesPriority;
    });
  }, [optimisticTasks, searchQuery, selectedAssignee, selectedPriority]);

  // Handle Drag & Drop Task between Buckets
  const handleTaskDrop = (taskId: string, targetBucketId: string): void => {
    const currentTask = optimisticTasks.find((t) => t.id === taskId);
    if (!currentTask || currentTask.bucket === targetBucketId) return;

    startTransition(async () => {
      setOptimisticTaskStatus({ taskId, targetBucketId });
      try {
        const result = await updateTaskStatus({ taskId, bucket: targetBucketId });
        if (result.success) {
          router.refresh();
        } else {
          sileo.error({
            title: "Error al mover tarea",
            description: result.error,
          });
        }
      } catch {
        sileo.error({
          title: "Error al mover tarea",
          description: "No se pudo actualizar el estado de la tarea.",
        });
      }
    });
  };

  // Handle Reorder Buckets
  const handleBucketReorder = (
    draggedBucketId: string,
    targetBucketId: string,
    side: "left" | "right"
  ): void => {
    if (draggedBucketId === targetBucketId) return;

    const currentList = [...buckets];
    const fromIndex = currentList.findIndex((b) => b.id === draggedBucketId);
    if (fromIndex === -1) return;

    const [movedBucket] = currentList.splice(fromIndex, 1);
    let toIndex = currentList.findIndex((b) => b.id === targetBucketId);
    if (toIndex === -1) return;

    if (side === "right") {
      toIndex += 1;
    }
    currentList.splice(toIndex, 0, movedBucket);

    startTransition(async () => {
      setOptimisticBuckets(currentList);
      try {
        const result = await updateProjectCustomOptions(projectId, {
          customStatuses: currentList,
        });
        if (result.success) {
          router.refresh();
        } else {
          sileo.error({
            title: "Error al reordenar buckets",
            description: result.error,
          });
        }
      } catch {
        sileo.error({
          title: "Error al reordenar buckets",
          description: "Ocurrió un error inesperado al mover el bucket.",
        });
      }
    });
  };

  // Handle Create New Bucket
  const handleCreateBucket = async (): Promise<void> => {
    if (!newBucketLabel.trim()) return;
    const bucketId = newBucketLabel.trim().toUpperCase().replace(/\s+/g, "_");

    if (buckets.some((b) => b.id === bucketId)) {
      const msg = "Ya existe un bucket con ese identificador";
      setBucketError(msg);
      sileo.warning({
        title: "Bucket duplicado",
        description: msg,
      });
      return;
    }

    const newBucket: BucketOption = {
      id: bucketId,
      label: newBucketLabel.trim(),
      color: newBucketColor,
    };

    const updatedBuckets = [...buckets, newBucket];
    setIsSavingBucket(true);
    setBucketError(null);

    try {
      const result = await updateProjectCustomOptions(projectId, {
        customStatuses: updatedBuckets,
      });

      if (!result.success) {
        setBucketError(result.error);
        sileo.error({
          title: "Error al crear bucket",
          description: result.error,
        });
      } else {
        setNewBucketLabel("");
        setIsNewBucketOpen(false);
        sileo.success({
          title: "Bucket creado",
          description: `El bucket "${newBucket.label}" fue agregado con éxito.`,
        });
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      const msg = "Error al guardar el nuevo bucket";
      setBucketError(msg);
      sileo.error({
        title: "Error al guardar bucket",
        description: msg,
      });
    } finally {
      setIsSavingBucket(false);
    }
  };

  // Internal executor for bucket deletion
  const executeDeleteBucket = async (bucketId: string, bucketLabel: string): Promise<void> => {
    const updatedBuckets = buckets.filter((b) => b.id !== bucketId);

    try {
      const res = await updateProjectCustomOptions(projectId, {
        customStatuses: updatedBuckets,
      });
      if (res.success) {
        sileo.success({
          title: "Bucket eliminado",
          description: `El bucket "${bucketLabel}" fue eliminado.`,
        });
        startTransition(() => {
          router.refresh();
        });
      } else {
        sileo.error({
          title: "Error al eliminar bucket",
          description: res.error,
        });
      }
    } catch {
      sileo.error({
        title: "Error al eliminar bucket",
        description: "Ocurrió un error inesperado al eliminar el bucket.",
      });
    }
  };

  // Handle Delete Bucket with confirmation toast and "No volver a preguntar" option
  const handleDeleteBucket = async (bucketId: string): Promise<void> => {
    if (buckets.length <= 1) {
      sileo.warning({
        title: "Acción no permitida",
        description: "Debes conservar al menos un bucket en el proyecto.",
      });
      return;
    }

    const tasksInBucket = optimisticTasks.filter((t) => t.bucket === bucketId);
    if (tasksInBucket.length > 0) {
      sileo.warning({
        title: "Bucket con tareas",
        description: `No podés eliminar este bucket porque contiene ${tasksInBucket.length} tarea(s). Movelos a otro bucket primero.`,
      });
      return;
    }

    const bucketToDelete = buckets.find((b) => b.id === bucketId);
    const bucketLabel = bucketToDelete?.label ?? bucketId;

    // Check if the user previously chose "No volver a preguntar"
    let skipConfirm = false;
    try {
      skipConfirm = localStorage.getItem(SKIP_BUCKET_DELETE_KEY) === "true";
    } catch {
      skipConfirm = false;
    }

    if (skipConfirm) {
      await executeDeleteBucket(bucketId, bucketLabel);
      return;
    }

    // Trigger confirmation toast
    let toastId = "";
    toastId = sileo.warning({
      title: "¿Eliminar bucket?",
      duration: 15000,
      autopilot: { expand: 40 },
      description: (
        <DeleteBucketConfirmToast
          bucketLabel={bucketLabel}
          onConfirm={(dontAskAgain) => {
            if (dontAskAgain) {
              try {
                localStorage.setItem(SKIP_BUCKET_DELETE_KEY, "true");
              } catch {
                // ignore
              }
            }
            if (toastId) {
              sileo.dismiss(toastId);
            }
            void executeDeleteBucket(bucketId, bucketLabel);
          }}
          onCancel={() => {
            if (toastId) {
              sileo.dismiss(toastId);
            }
          }}
        />
      ),
    });
  };

  // Handle Update Bucket (label and color)
  const handleUpdateBucket = async (
    bucketId: string,
    updates: { label: string; color: string }
  ): Promise<void> => {
    const updatedBuckets = buckets.map((b) =>
      b.id === bucketId
        ? { ...b, label: updates.label.trim(), color: updates.color }
        : b
    );

    try {
      const res = await updateProjectCustomOptions(projectId, {
        customStatuses: updatedBuckets,
      });
      if (res.success) {
        sileo.success({
          title: "Bucket actualizado",
          description: `El bucket "${updates.label.trim()}" fue modificado correctamente.`,
        });
        startTransition(() => {
          router.refresh();
        });
      } else {
        sileo.error({
          title: "Error al actualizar bucket",
          description: res.error,
        });
      }
    } catch {
      sileo.error({
        title: "Error al actualizar bucket",
        description: "Ocurrió un error inesperado al actualizar el bucket.",
      });
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedAssignee !== "ALL" ||
    selectedPriority !== "ALL";

  const clearFilters = (): void => {
    setSearchQuery("");
    setSelectedAssignee("ALL");
    setSelectedPriority("ALL");
  };

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0 h-full w-full overflow-hidden">
      {/* Top Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        {/* Search & Filter pills */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-70">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
            <Input
              type="search"
              placeholder="Buscar en buckets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8.5 w-48 md:w-60 pl-8.5 text-xs bg-surface border-border rounded-xl"
            />
          </div>

          {/* Assignee Filter */}
          {members.length > 0 && (
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="h-8.5 rounded-xl border border-border bg-surface px-2.5 text-xs text-text-secondary hover:text-text-primary">
                <SelectValue placeholder="Todos los asignados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los asignados</SelectItem>
                <SelectItem value="UNASSIGNED">Sin asignar</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name ?? m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Priority Filter */}
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="h-8.5 rounded-xl border border-border bg-surface px-2.5 text-xs text-text-secondary hover:text-text-primary">
              <SelectValue placeholder="Todas las prioridades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las prioridades</SelectItem>
              <SelectItem value="LOW">Baja</SelectItem>
              <SelectItem value="MEDIUM">Media</SelectItem>
              <SelectItem value="HIGH">Alta</SelectItem>
              <SelectItem value="URGENT">Urgente</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8.5 text-xs text-text-muted hover:text-text-primary gap-1 px-2 rounded-xl"
            >
              <IconX className="size-3.5" />
              <span>Limpiar</span>
            </Button>
          )}
        </div>

        {/* Action Controls & Format Switcher */}
        <div className="flex items-center gap-2">
          {/* View format switcher (Kanban / Table) */}
          <div className="flex items-center rounded-xl border border-border/80 p-0.5 bg-surface-elevated/40">
            <button
              type="button"
              onClick={() => setViewFormat("board")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                viewFormat === "board"
                  ? "bg-surface text-primary shadow-xs font-semibold"
                  : "text-text-muted hover:text-text-primary"
              )}
              title="Vista de Buckets (Kanban)"
            >
              <IconLayoutKanban className="size-3.5" />
              <span className="hidden sm:inline">Buckets</span>
            </button>
            <button
              type="button"
              onClick={() => setViewFormat("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                viewFormat === "table"
                  ? "bg-surface text-primary shadow-xs font-semibold"
                  : "text-text-muted hover:text-text-primary"
              )}
              title="Vista de Tabla"
            >
              <IconTable className="size-3.5" />
              <span className="hidden sm:inline">Tabla</span>
            </button>
          </div>

          {canEdit && (
            <>
              {/* Create Bucket Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewBucketOpen(true)}
                className="h-8.5 text-xs border-border bg-surface hover:bg-surface-elevated text-text-primary gap-1.5 rounded-xl shadow-2xs"
              >
                <IconPlus className="size-3.5 text-primary" />
                <span>Nuevo Bucket</span>
              </Button>

              {/* Configure Statuses/Priorities */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfigOpen(true)}
                className="size-8.5 p-0 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-elevated"
                title="Configurar estados y prioridades"
                aria-label="Configurar estados y prioridades"
              >
                <IconAdjustmentsHorizontal className="size-4" />
              </Button>

              {/* New Task Button */}
              <Button
                size="sm"
                variant="default"
                onClick={() => setIsNewTaskOpen(true)}
                className="h-8.5 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs gap-1.5 rounded-xl shadow-xs"
              >
                <IconPlus className="size-3.5" />
                <span>Nueva Tarea</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewFormat === "table" ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <TaskTable
            projectId={projectId}
            tasks={filteredTasks}
            members={members}
            availableEpics={availableEpics}
            customStatuses={customStatuses}
            customPriorities={customPriorities}
            canEdit={canEdit}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 select-none">
          {buckets.map((bucket) => {
            const bucketTasks = filteredTasks.filter(
              (task) => task.bucket === bucket.id
            );
            return (
              <TaskBucketColumn
                key={bucket.id}
                bucket={bucket}
                tasks={bucketTasks}
                projectId={projectId}
                members={members}
                availableEpics={availableEpics}
                customStatuses={customStatuses}
                customPriorities={customPriorities}
                canEdit={canEdit}
                onTaskDrop={handleTaskDrop}
                onBucketReorder={handleBucketReorder}
                onUpdateBucket={handleUpdateBucket}
                onDeleteBucket={handleDeleteBucket}
                canDeleteBucket={canEdit && buckets.length > 1}
              />
            );
          })}

          {/* Add Bucket Quick Card at end of columns */}
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsNewBucketOpen(true)}
              className="flex flex-col items-center justify-center gap-2.5 w-72 md:w-80 shrink-0 h-36 rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-surface/30 hover:bg-surface/60 text-text-muted hover:text-primary transition-all group self-start"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-surface-elevated border border-border group-hover:border-primary/40 group-hover:scale-105 transition-all text-text-secondary group-hover:text-primary shadow-2xs">
                <IconPlus className="size-5" />
              </div>
              <span className="text-xs font-semibold tracking-tight">
                Crear nuevo bucket
              </span>
            </button>
          )}
        </div>
      )}

      {/* New Task Dialog */}
      {isNewTaskOpen && (
        <TaskFormDialog
          projectId={projectId}
          members={members}
          availableEpics={availableEpics}
          customStatuses={customStatuses}
          customPriorities={customPriorities}
          isOpen={isNewTaskOpen}
          onOpenChange={setIsNewTaskOpen}
        />
      )}

      {/* Status & Priority Config Dialog */}
      <TaskStatusPriorityConfigDialog
        projectId={projectId}
        isOpen={isConfigOpen}
        onOpenChange={setIsConfigOpen}
        currentStatuses={buckets}
        currentPriorities={
          customPriorities && customPriorities.length > 0
            ? customPriorities
            : [
                { id: "LOW", label: "Baja" },
                { id: "MEDIUM", label: "Media" },
                { id: "HIGH", label: "Alta" },
                { id: "URGENT", label: "Urgente" },
              ]
        }
      />

      {/* Create Bucket Dialog */}
      <Dialog open={isNewBucketOpen} onOpenChange={setIsNewBucketOpen}>
        <DialogContent className="sm:max-w-md bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-text-primary">
              Crear Nuevo Bucket
            </DialogTitle>
            <DialogDescription className="text-xs text-text-muted">
              Agregá una nueva columna para organizar tus tareas en el tablero.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {bucketError && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 p-2.5 text-xs text-danger">
                {bucketError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="bucket-name-input" className="text-xs font-medium text-text-secondary">
                Nombre del Bucket
              </label>
              <Input
                id="bucket-name-input"
                placeholder="Ej. En Pruebas, QA, Sprint 2..."
                value={newBucketLabel}
                onChange={(e) => setNewBucketLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateBucket();
                  }
                }}
                className="bg-background border-border text-xs rounded-xl"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="bucket-color-picker" className="text-xs font-medium text-text-secondary">
                Color del Indicador
              </label>
              <div className="flex items-center gap-2">
                {[
                  "#0ea5e9", // Sky
                  "#00f28e", // Neon Mint
                  "#10b981", // Emerald
                  "#f59e0b", // Amber
                  "#f97316", // Orange
                  "#ef4444", // Rose
                  "#a855f7", // Purple
                  "#64748b", // Slate
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewBucketColor(color)}
                    className={cn(
                      "size-6 rounded-full transition-transform hover:scale-110",
                      newBucketColor === color && "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Seleccionar color ${color}`}
                  />
                ))}
                <input
                  id="bucket-color-picker"
                  type="color"
                  value={newBucketColor}
                  onChange={(e) => setNewBucketColor(e.target.value)}
                  className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0 ml-1"
                  title="Color personalizado"
                  aria-label="Color personalizado"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewBucketOpen(false)}
              className="text-xs border-border"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateBucket}
              disabled={!newBucketLabel.trim() || isSavingBucket}
              className="text-xs bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
            >
              {isSavingBucket ? "Creando..." : "Crear Bucket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
