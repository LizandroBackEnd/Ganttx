"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TaskCard } from "./task-card";
import { TaskFormDialog, type ProjectMemberOption, type TaskEpicOption } from "./task-form-dialog";
import { BucketConfigDialog } from "./bucket-config-dialog";
import { Button } from "@/shared/components/ui/button";
import { IconPlus, IconDots, IconSquarePlus, IconX, IconGripVertical } from "@tabler/icons-react";
import { createTask } from "../api/task-mutations";
import { sileo } from "sileo";
import { cn } from "@/lib/utils";
import type {
  TaskDTO,
  BucketOption,
  CustomStatusOption,
  CustomPriorityOption,
} from "../types/task.types";

export interface TaskBucketColumnProps {
  readonly bucket: BucketOption;
  readonly tasks: readonly TaskDTO[];
  readonly allTasks?: readonly TaskDTO[];
  readonly projectId: string;
  readonly members?: readonly ProjectMemberOption[];
  readonly availableEpics?: readonly TaskEpicOption[];
  readonly customStatuses?: readonly CustomStatusOption[] | null;
  readonly customPriorities?: readonly CustomPriorityOption[] | null;
  readonly canEdit?: boolean;
  readonly onTaskDrop: (taskId: string, targetBucketId: string) => void;
  readonly onBucketReorder?: (
    sourceBucketId: string,
    targetBucketId: string,
    side: "left" | "right"
  ) => void;
  readonly onUpdateBucket?: (
    bucketId: string,
    updates: { label: string; color: string }
  ) => Promise<void> | void;
  readonly onDeleteBucket?: (bucketId: string) => void;
  readonly canDeleteBucket?: boolean;
}

export function TaskBucketColumn({
  bucket,
  tasks,
  allTasks,
  projectId,
  members = [],
  availableEpics = [],
  customStatuses,
  customPriorities,
  canEdit = true,
  onTaskDrop,
  onBucketReorder,
  onUpdateBucket,
  onDeleteBucket,
  canDeleteBucket = false,
}: TaskBucketColumnProps): React.JSX.Element {
  const router = useRouter();
  const [isOver, setIsOver] = useState<boolean>(false);
  const [isBucketDragging, setIsBucketDragging] = useState<boolean>(false);
  const [bucketDropIndicator, setBucketDropIndicator] = useState<"left" | "right" | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Inline Task Creation state
  const [isInlineAdding, setIsInlineAdding] = useState<boolean>(false);
  const [inlineTitle, setInlineTitle] = useState<string>("");
  const [isSubmittingInline, setIsSubmittingInline] = useState<boolean>(false);

  // Modal open after inline task creation
  const [createdTaskForModal, setCreatedTaskForModal] = useState<TaskDTO | undefined>(undefined);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const handleBucketDragStart = (e: React.DragEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    e.dataTransfer.setData("application/x-bucket-id", bucket.id);
    e.dataTransfer.effectAllowed = "move";
    setIsBucketDragging(true);
  };

  const handleBucketDragEnd = (): void => {
    setIsBucketDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const isBucket = e.dataTransfer.types.includes("application/x-bucket-id");
    if (isBucket) {
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;
      const side = e.clientX < midpoint ? "left" : "right";
      setBucketDropIndicator(side);
      if (isOver) setIsOver(false);
    } else {
      if (bucketDropIndicator) setBucketDropIndicator(null);
      if (!isOver) setIsOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOver(false);
      setBucketDropIndicator(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsOver(false);
    const side = bucketDropIndicator;
    setBucketDropIndicator(null);

    const draggedBucketId = e.dataTransfer.getData("application/x-bucket-id");
    if (draggedBucketId) {
      if (draggedBucketId !== bucket.id && onBucketReorder) {
        onBucketReorder(draggedBucketId, bucket.id, side ?? "left");
      }
      return;
    }

    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      onTaskDrop(taskId, bucket.id);
    }
  };

  const handleInlineCreate = async (): Promise<void> => {
    if (!inlineTitle.trim() || isSubmittingInline) return;
    setIsSubmittingInline(true);

    try {
      const res = await createTask({
        projectId,
        title: inlineTitle.trim(),
        bucket: bucket.id,
        label: "MEDIUM",
        startDate: null,
        dueDate: null,
        isEpic: false,
      });

      if (res.success && res.data) {
        setInlineTitle("");
        setIsInlineAdding(false);
        setCreatedTaskForModal(res.data);
        setIsDetailModalOpen(true);
        sileo.success({
          title: "Tarea creada",
          description: `"${res.data.title}" se agregó al bucket ${bucket.label}.`,
        });
        router.refresh();
      } else {
        const errorMsg = !res.success ? res.error : "No se pudo crear la tarea.";
        sileo.error({
          title: "Error al crear tarea",
          description: errorMsg,
        });
      }
    } catch {
      sileo.error({
        title: "Error inesperado",
        description: "Ocurrió un error al crear la tarea.",
      });
    } finally {
      setIsSubmittingInline(false);
    }
  };

  const bucketColor = bucket.color ?? "#0ea5e9";

  const renderInlineComposer = (): React.JSX.Element => (
    <div className="flex flex-col gap-2 rounded-2xl border border-primary/40 bg-surface p-2.5 shadow-sm mt-0.5 animate-in fade-in-50 duration-150">
      <textarea
        rows={2}
        value={inlineTitle}
        onChange={(e) => setInlineTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleInlineCreate();
          } else if (e.key === "Escape") {
            setIsInlineAdding(false);
            setInlineTitle("");
          }
        }}
        placeholder="Escribe el nombre de la tarea..."
        autoFocus
        disabled={isSubmittingInline}
        className="w-full resize-none border-0 bg-transparent p-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
      />
      <div className="flex items-center justify-between gap-1.5 pt-1">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={() => void handleInlineCreate()}
            disabled={!inlineTitle.trim() || isSubmittingInline}
            className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary-hover px-2.5 font-semibold rounded-lg"
          >
            {isSubmittingInline ? "Creando..." : "Añadir"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setIsInlineAdding(false);
              setInlineTitle("");
            }}
            disabled={isSubmittingInline}
            className="size-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
            title="Cancelar"
          >
            <IconX className="size-4" />
          </button>
        </div>
        <span className="text-[10px] text-text-muted font-mono hidden sm:inline">
          Enter ↵
        </span>
      </div>
    </div>
  );

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col w-72 md:w-80 shrink-0 h-full max-h-full rounded-2xl border transition-all duration-200 overflow-hidden relative",
          "bg-surface/50 border-border/80 shadow-xs",
          isBucketDragging && "opacity-40 scale-[0.98] border-dashed border-primary/50",
          isOver && "ring-2 ring-primary/60 border-primary bg-primary/4",
          bucketDropIndicator === "left" && "border-l-4 border-l-primary ring-2 ring-primary/40",
          bucketDropIndicator === "right" && "border-r-4 border-r-primary ring-2 ring-primary/40"
        )}
      >
        {/* Bucket Header: Drag Grip, Title, Count, Settings (•••) */}
        <div className="shrink-0 flex items-center justify-between p-3.5 border-b border-border/60 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {canEdit && (
              <div
                draggable
                onDragStart={handleBucketDragStart}
                onDragEnd={handleBucketDragEnd}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-text-muted hover:text-text-primary rounded-md hover:bg-surface-elevated transition-colors shrink-0"
                title="Arrastrar para mover bucket"
                aria-label="Arrastrar para mover bucket"
              >
                <IconGripVertical className="size-3.5" />
              </div>
            )}
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: bucketColor }}
            />
            <h3 className="text-xs font-bold tracking-tight text-text-primary uppercase truncate">
              {bucket.label}
            </h3>
            <span className="flex size-5 items-center justify-center rounded-md bg-surface-elevated text-[11px] font-mono font-semibold text-text-secondary border border-border/80 shrink-0">
              {tasks.length}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsConfigOpen(true)}
                className="flex size-6 items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
                aria-label={`Configurar bucket ${bucket.label}`}
                title="Configuración de bucket"
              >
                <IconDots className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Task Cards Container - internal vertical scroll only */}
        <div className="flex flex-col gap-2.5 p-3 flex-1 min-h-0 overflow-y-auto">
          {tasks.length === 0 ? (
            <div
              className={cn(
                "rounded-xl transition-all",
                isOver && "ring-2 ring-primary/40 bg-primary/5 p-2 rounded-xl"
              )}
            >
              {canEdit &&
                (isInlineAdding ? (
                  renderInlineComposer()
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsInlineAdding(true)}
                    className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs text-text-muted hover:text-text-primary hover:bg-surface-elevated/70 transition-all border border-transparent hover:border-border/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <IconPlus className="size-4 text-text-muted group-hover:text-text-primary transition-colors" />
                      <span className="font-normal text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                        Añade una tarjeta
                      </span>
                    </div>
                    <IconSquarePlus className="size-4 text-text-muted/60 group-hover:text-text-primary transition-colors" />
                  </button>
                ))}
            </div>
          ) : (
            <>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  projectId={projectId}
                  members={members}
                  availableEpics={availableEpics}
                  availableTasks={allTasks ?? tasks}
                  customStatuses={customStatuses}
                  customPriorities={customPriorities}
                  canEdit={canEdit}
                />
              ))}

              {canEdit &&
                (isInlineAdding ? (
                  renderInlineComposer()
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsInlineAdding(true)}
                    className="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-surface-elevated/70 transition-all border border-transparent hover:border-border/60 cursor-pointer mt-0.5"
                  >
                    <div className="flex items-center gap-2">
                      <IconPlus className="size-4 text-text-muted group-hover:text-text-primary transition-colors" />
                      <span className="font-normal text-xs text-text-secondary group-hover:text-text-primary transition-colors">
                        Añade una tarjeta
                      </span>
                    </div>
                    <IconSquarePlus className="size-4 text-text-muted/60 group-hover:text-text-primary transition-colors" />
                  </button>
                ))}
            </>
          )}
        </div>
      </div>

      {/* Bucket Config Modal (Name & Color) */}
      {isConfigOpen && (
        <BucketConfigDialog
          bucket={bucket}
          isOpen={isConfigOpen}
          onOpenChange={setIsConfigOpen}
          onSave={(updates) => onUpdateBucket?.(bucket.id, updates)}
          onDelete={() => onDeleteBucket?.(bucket.id)}
          canDelete={canDeleteBucket}
        />
      )}

      {/* Detail Task Modal with Auto-save opened right after inline creation */}
      {isDetailModalOpen && createdTaskForModal && (
        <TaskFormDialog
          projectId={projectId}
          taskToEdit={createdTaskForModal}
          members={members}
          availableEpics={availableEpics}
          availableTasks={allTasks ?? tasks}
          customStatuses={customStatuses}
          customPriorities={customPriorities}
          isOpen={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
        />
      )}
    </>
  );
}
