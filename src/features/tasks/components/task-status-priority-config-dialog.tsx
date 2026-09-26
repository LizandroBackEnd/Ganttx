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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconCheck,
  IconX,
  IconTag,
  IconRefresh,
} from "@tabler/icons-react";
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

export const PRESET_LABEL_COLORS = [
  { name: "Azul", value: "#0284c7" },
  { name: "Cian", value: "#06b6d4" },
  { name: "Verde", value: "#10b981" },
  { name: "Lima", value: "#84cc16" },
  { name: "Amarillo", value: "#eab308" },
  { name: "Naranja", value: "#f97316" },
  { name: "Rojo", value: "#ef4444" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Púrpura", value: "#a855f7" },
  { name: "Gris", value: "#64748b" },
];

export const ESSENTIAL_PRIORITIES: readonly CustomPriorityOption[] = [
  { id: "LOW", label: "Baja", color: "#0284c7" },
  { id: "MEDIUM", label: "Media", color: "#eab308" },
  { id: "HIGH", label: "Alta", color: "#f97316" },
  { id: "URGENT", label: "Urgente", color: "#ef4444" },
];

function getPriorityColor(pr: CustomPriorityOption): string {
  if (pr.color) return pr.color;
  const upper = pr.id.toUpperCase();
  if (upper.includes("URGENT") || upper.includes("CRITIC")) return "#ef4444";
  if (upper.includes("HIGH") || upper.includes("ALTA")) return "#f97316";
  if (upper.includes("MED")) return "#eab308";
  if (upper.includes("LOW") || upper.includes("BAJA")) return "#0284c7";
  return "#0284c7";
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
  const [priorities, setPriorities] = useState<CustomPriorityOption[]>(() =>
    currentPriorities && currentPriorities.length > 0
      ? currentPriorities.map((p) => ({ ...p, color: getPriorityColor(p) }))
      : [...ESSENTIAL_PRIORITIES]
  );
  const [newPriorityLabel, setNewPriorityLabel] = useState<string>("");
  const [newPriorityColor, setNewPriorityColor] = useState<string>("#0284c7");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddPriority = (): void => {
    const trimmed = newPriorityLabel.trim();
    if (!trimmed) return;
    const id = trimmed.toUpperCase().replace(/\s+/g, "_");
    if (priorities.some((p) => p.id === id)) {
      setError("Ya existe una etiqueta con ese nombre o identificador");
      return;
    }
    setPriorities([
      ...priorities,
      { id, label: trimmed, color: newPriorityColor },
    ]);
    setNewPriorityLabel("");
    setError(null);
  };

  const handleRemovePriority = (id: string): void => {
    if (priorities.length <= 1) {
      setError("Debes mantener al menos una etiqueta en el proyecto");
      return;
    }
    setPriorities(priorities.filter((p) => p.id !== id));
    setError(null);
  };

  const handleStartEdit = (pr: CustomPriorityOption): void => {
    setEditingId(pr.id);
    setEditingLabel(pr.label);
  };

  const handleSaveEdit = (id: string): void => {
    const trimmed = editingLabel.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    setPriorities(
      priorities.map((p) => (p.id === id ? { ...p, label: trimmed } : p))
    );
    setEditingId(null);
  };

  const handleChangeColor = (id: string, color: string): void => {
    setPriorities(
      priorities.map((p) => (p.id === id ? { ...p, color } : p))
    );
  };

  const handleResetEssentials = (): void => {
    setPriorities([...ESSENTIAL_PRIORITIES]);
    setError(null);
  };

  const handleSave = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await updateProjectCustomOptions(projectId, {
        customPriorities: priorities,
      });

      if (!res.success) {
        setError(res.error);
        setIsLoading(false);
        return;
      }

      onSaved?.([...currentStatuses], priorities);
      onOpenChange(false);
      router.refresh();
    } catch {
      setError("Ocurrió un error al guardar las etiquetas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-surface sm:max-w-lg z-70">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconTag className="size-4" />
              </div>
              <DialogTitle className="text-base font-bold text-text-primary">
                Personalizar Etiquetas
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={handleResetEssentials}
              className="text-[11px] text-text-muted hover:text-primary flex items-center gap-1 transition-colors cursor-pointer mr-6"
              title="Dejar solo las etiquetas esenciales por defecto"
            >
              <IconRefresh className="size-3" />
              <span>Solo esenciales</span>
            </button>
          </div>
          <DialogDescription className="text-xs text-text-secondary">
            Personaliza los colores, nombres y quita o agrega las etiquetas de tu proyecto.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="my-1 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="my-3 flex flex-col gap-4 max-h-[58vh] overflow-y-auto pr-1">
          {/* Lista de Etiquetas estilo Pill como en la imagen */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Etiquetas activas ({priorities.length})
            </span>

            <div className="flex flex-col gap-2 p-1">
              {priorities.map((pr) => {
                const color = getPriorityColor(pr);
                const isEditing = editingId === pr.id;

                return (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-elevated/30 p-2 text-xs transition-colors hover:border-border"
                  >
                    {/* Left: Pill Badge or Inline Edit */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <Input
                            autoFocus
                            value={editingLabel}
                            onChange={(e) => setEditingLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveEdit(pr.id);
                              } else if (e.key === "Escape") {
                                setEditingId(null);
                              }
                            }}
                            className="h-7 text-xs bg-background"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(pr.id)}
                            className="p-1 rounded text-primary hover:bg-primary/10 cursor-pointer"
                            title="Guardar nombre"
                          >
                            <IconCheck className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded text-text-muted hover:text-text-primary cursor-pointer"
                            title="Cancelar"
                          >
                            <IconX className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold border shadow-xs transition-transform"
                          style={{
                            backgroundColor: `${color}22`,
                            color: color,
                            borderColor: `${color}55`,
                          }}
                        >
                          {pr.label}
                        </span>
                      )}
                    </div>

                    {/* Right: Color Selector + Edit Button + Delete Button */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Color Picker Popover */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="size-6 rounded-full border border-white/20 shadow-xs cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                            style={{ backgroundColor: color }}
                            title="Cambiar color"
                          />
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          className="w-48 p-2.5 bg-surface border-border shadow-xl rounded-xl"
                        >
                          <span className="text-[11px] font-medium text-text-secondary block mb-2">
                            Seleccionar color
                          </span>
                          <div className="grid grid-cols-5 gap-2">
                            {PRESET_LABEL_COLORS.map((preset) => (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => handleChangeColor(pr.id, preset.value)}
                                className="size-6 rounded-full border border-white/20 hover:scale-115 transition-transform cursor-pointer relative flex items-center justify-center"
                                style={{ backgroundColor: preset.value }}
                                title={preset.name}
                              >
                                {color.toLowerCase() === preset.value.toLowerCase() && (
                                  <IconCheck className="size-3 text-white stroke-3" />
                                )}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Botón Editar Nombre (Lápiz como en la imagen) */}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(pr)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                          title="Editar nombre"
                        >
                          <IconPencil className="size-3.5" />
                        </button>
                      )}

                      {/* Botón Eliminar Etiqueta */}
                      <button
                        type="button"
                        onClick={() => handleRemovePriority(pr.id)}
                        disabled={priorities.length <= 1}
                        className="p-1.5 rounded-lg text-text-muted hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Eliminar etiqueta"
                        aria-label={`Eliminar etiqueta ${pr.label}`}
                      >
                        <IconTrash className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formulario para Agregar Nueva Etiqueta */}
          <div className="flex flex-col gap-2 border-t border-border/40 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Crear nueva etiqueta
            </span>

            <div className="flex items-center gap-2">
              {/* Color selector para la nueva etiqueta */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="size-8 rounded-xl border border-white/20 shadow-xs cursor-pointer hover:scale-105 transition-transform shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: newPriorityColor }}
                    title="Color de la nueva etiqueta"
                  />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-48 p-2.5 bg-surface border-border shadow-xl rounded-xl"
                >
                  <span className="text-[11px] font-medium text-text-secondary block mb-2">
                    Elegir color
                  </span>
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_LABEL_COLORS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setNewPriorityColor(preset.value)}
                        className="size-6 rounded-full border border-white/20 hover:scale-115 transition-transform cursor-pointer relative flex items-center justify-center"
                        style={{ backgroundColor: preset.value }}
                        title={preset.name}
                      >
                        {newPriorityColor.toLowerCase() === preset.value.toLowerCase() && (
                          <IconCheck className="size-3 text-white stroke-3" />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Input
                type="text"
                placeholder="Nombre de etiqueta (ej. Frontend, Bug, Diseño)..."
                value={newPriorityLabel}
                onChange={(e) => setNewPriorityLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPriority();
                  }
                }}
                className="h-8 text-xs bg-background flex-1"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPriority}
                disabled={!newPriorityLabel.trim()}
                className="h-8 text-xs shrink-0 cursor-pointer"
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
            className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
          >
            {isLoading ? "Guardando..." : "Guardar Etiquetas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
