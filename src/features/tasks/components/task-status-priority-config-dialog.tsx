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
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { IconPlus, IconTrash, IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { updateProjectCustomOptions } from "../api/task-mutations";
import type { CustomStatusOption, CustomPriorityOption } from "../types/task.types";

export interface TaskStatusPriorityConfigDialogProps {
  readonly projectId: string;
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly currentStatuses: readonly CustomStatusOption[];
  readonly currentPriorities: readonly CustomPriorityOption[];
  readonly onSaved?: (statuses: CustomStatusOption[], priorities: CustomPriorityOption[]) => void;
}

export function TaskStatusPriorityConfigDialog({
  projectId,
  isOpen,
  onOpenChange,
  currentStatuses,
  currentPriorities,
  onSaved,
}: TaskStatusPriorityConfigDialogProps): React.JSX.Element {
  const router = useRouter();
  const [statuses, setStatuses] = useState<CustomStatusOption[]>(() => [...currentStatuses]);
  const [priorities, setPriorities] = useState<CustomPriorityOption[]>(() => [...currentPriorities]);
  const [newStatusLabel, setNewStatusLabel] = useState<string>("");
  const [newPriorityLabel, setNewPriorityLabel] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddStatus = (): void => {
    if (!newStatusLabel.trim()) return;
    const id = newStatusLabel.trim().toUpperCase().replace(/\s+/g, "_");
    if (statuses.some((s) => s.id === id)) {
      setError("Ya existe un estado con ese identificador");
      return;
    }
    setStatuses([...statuses, { id, label: newStatusLabel.trim() }]);
    setNewStatusLabel("");
    setError(null);
  };

  const handleRemoveStatus = (id: string): void => {
    if (statuses.length <= 1) {
      setError("Debes mantener al menos un estado");
      return;
    }
    setStatuses(statuses.filter((s) => s.id !== id));
    setError(null);
  };

  const handleAddPriority = (): void => {
    if (!newPriorityLabel.trim()) return;
    const id = newPriorityLabel.trim().toUpperCase().replace(/\s+/g, "_");
    if (priorities.some((p) => p.id === id)) {
      setError("Ya existe una prioridad con ese identificador");
      return;
    }
    setPriorities([...priorities, { id, label: newPriorityLabel.trim() }]);
    setNewPriorityLabel("");
    setError(null);
  };

  const handleRemovePriority = (id: string): void => {
    if (priorities.length <= 1) {
      setError("Debes mantener al menos una prioridad");
      return;
    }
    setPriorities(priorities.filter((p) => p.id !== id));
    setError(null);
  };

  const handleSave = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await updateProjectCustomOptions(projectId, {
        customStatuses: statuses,
        customPriorities: priorities,
      });

      if (!res.success) {
        setError(res.error);
        setIsLoading(false);
        return;
      }

      onSaved?.(statuses, priorities);
      onOpenChange(false);
      router.refresh();
    } catch {
      setError("Ocurrió un error al guardar la configuración");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-surface sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconAdjustmentsHorizontal className="size-4" />
            </div>
            <DialogTitle className="text-lg font-bold text-text-primary">
              Personalizar Estados y Prioridades
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-text-secondary">
            Agrega o quita estados y prioridades que se adapten al flujo de trabajo de tu proyecto.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="my-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="my-4 flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-1">
          {/* Section: Estados */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Estados del Proyecto
            </h4>
            <div className="flex flex-col gap-1.5">
              {statuses.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-text-primary"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary/70" />
                    <span>{st.label}</span>
                    <span className="text-[10px] font-mono text-text-muted">({st.id})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStatus(st.id)}
                    className="text-text-muted hover:text-destructive transition-colors p-1"
                    aria-label={`Eliminar estado ${st.label}`}
                  >
                    <IconTrash className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Input
                type="text"
                placeholder="Nuevo estado (ej. En QA, Bloqueada)..."
                value={newStatusLabel}
                onChange={(e) => setNewStatusLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddStatus())}
                className="h-8 text-xs bg-background"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddStatus}
                className="h-8 text-xs shrink-0"
              >
                <IconPlus className="size-3.5 mr-1" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Section: Prioridades */}
          <div className="flex flex-col gap-2.5 border-t border-border/40 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Prioridades del Proyecto
            </h4>
            <div className="flex flex-col gap-1.5">
              {priorities.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-text-primary"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-400/80" />
                    <span>{pr.label}</span>
                    <span className="text-[10px] font-mono text-text-muted">({pr.id})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePriority(pr.id)}
                    className="text-text-muted hover:text-destructive transition-colors p-1"
                    aria-label={`Eliminar prioridad ${pr.label}`}
                  >
                    <IconTrash className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Input
                type="text"
                placeholder="Nueva prioridad (ej. Crítica, Opcional)..."
                value={newPriorityLabel}
                onChange={(e) => setNewPriorityLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPriority())}
                className="h-8 text-xs bg-background"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPriority}
                className="h-8 text-xs shrink-0"
              >
                <IconPlus className="size-3.5 mr-1" />
                Agregar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 border-t border-border/40 pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleSave}
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            {isLoading ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
