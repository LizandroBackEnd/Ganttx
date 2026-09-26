"use client";

import { useState } from "react";
import { TaskCard } from "./task-card";
import { TaskFormDialog, type ProjectMemberOption, type TaskEpicOption } from "./task-form-dialog";
import { BucketConfigDialog } from "./bucket-config-dialog";
import { IconPlus, IconDots, IconSquarePlus } from "@tabler/icons-react";
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
  readonly projectId: string;
  readonly members?: readonly ProjectMemberOption[];
  readonly availableEpics?: readonly TaskEpicOption[];
  readonly customStatuses?: readonly CustomStatusOption[] | null;
  readonly customPriorities?: readonly CustomPriorityOption[] | null;
  readonly canEdit?: boolean;
  readonly onTaskDrop: (taskId: string, targetBucketId: string) => void;
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
  projectId,
  members = [],
  availableEpics = [],
  customStatuses,
  customPriorities,
  canEdit = true,
  onTaskDrop,
  onUpdateBucket,
  onDeleteBucket,
  canDeleteBucket = false,
}: TaskBucketColumnProps): React.JSX.Element {
  const [isOver, setIsOver] = useState<boolean>(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsOver(false);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      onTaskDrop(taskId, bucket.id);
    }
  };

  const bucketColor = bucket.color ?? "#0ea5e9";

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col w-72 md:w-80 shrink-0 h-full max-h-full rounded-2xl border transition-all duration-200 overflow-hidden",
          "bg-surface/50 border-border/80 shadow-xs",
          isOver && "ring-2 ring-primary/60 border-primary bg-primary/4"
        )}
      >
        {/* Bucket Header: Title, Count, Settings (•••) */}
        <div className="shrink-0 flex items-center justify-between p-3.5 border-b border-border/60 gap-2">
          <div className="flex items-center gap-2 min-w-0">
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
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(true)}
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
              )}
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
                  customStatuses={customStatuses}
                  customPriorities={customPriorities}
                  canEdit={canEdit}
                />
              ))}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(true)}
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
              )}
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

      {/* Quick Task Creation Dialog with Bucket Preselected */}
      {isNewTaskOpen && (
        <TaskFormDialog
          projectId={projectId}
          defaultStatus={bucket.id}
          members={members}
          availableEpics={availableEpics}
          customStatuses={customStatuses}
          customPriorities={customPriorities}
          isOpen={isNewTaskOpen}
          onOpenChange={setIsNewTaskOpen}
        />
      )}
    </>
  );
}
