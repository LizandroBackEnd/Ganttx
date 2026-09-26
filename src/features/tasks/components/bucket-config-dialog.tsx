"use client";

import { useState } from "react";
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
import { IconTrash, IconCheck } from "@tabler/icons-react";
import type { BucketOption } from "../types/task.types";

export interface BucketConfigDialogProps {
  readonly bucket: BucketOption;
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (updates: { label: string; color: string }) => Promise<void> | void;
  readonly onDelete?: () => void;
  readonly canDelete?: boolean;
}

const PRESET_COLORS = [
  "#0ea5e9", // Sky
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#8b5cf6", // Purple
  "#6366f1", // Indigo
  "#f97316", // Orange
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#64748b", // Slate
];

interface BucketFormContentProps {
  readonly bucket: BucketOption;
  readonly onSave: (updates: { label: string; color: string }) => Promise<void> | void;
  readonly onClose: () => void;
  readonly onDelete?: () => void;
  readonly canDelete?: boolean;
}

function BucketFormContent({
  bucket,
  onSave,
  onClose,
  onDelete,
  canDelete = false,
}: BucketFormContentProps): React.JSX.Element {
  const [label, setLabel] = useState<string>(bucket.label);
  const [color, setColor] = useState<string>(bucket.color ?? "#0ea5e9");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!label.trim()) {
      setError("El nombre del bucket es obligatorio");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onSave({ label: label.trim(), color });
      onClose();
    } catch {
      setError("Error al guardar los cambios del bucket");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle className="text-lg font-bold text-text-primary">
          Configurar Bucket
        </DialogTitle>
        <DialogDescription className="text-xs text-text-secondary mt-0.5">
          Personaliza el nombre y el color identificador de esta columna.
        </DialogDescription>
      </DialogHeader>

      <div className="my-5 flex flex-col gap-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Bucket Label */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bucket-edit-label" className="text-xs font-semibold text-text-primary">
            Nombre del Bucket *
          </label>
          <Input
            id="bucket-edit-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ej. Por Hacer, En Revisión..."
            disabled={isLoading}
            required
            maxLength={50}
            className="border-border bg-background text-xs"
          />
        </div>

        {/* Bucket Color */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-text-primary">
            Color Identificador
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-hidden"
                style={{ backgroundColor: c }}
              >
                {color.toLowerCase() === c.toLowerCase() && (
                  <IconCheck className="size-4 text-white drop-shadow-sm" />
                )}
              </button>
            ))}

            {/* Custom Color Input */}
            <div className="relative flex items-center">
              <input
                type="color"
                id="bucket-custom-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-7 cursor-pointer opacity-0 absolute inset-0"
                title="Color personalizado"
              />
              <div
                className="size-7 rounded-full border border-border shadow-xs flex items-center justify-center"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t border-border/40 pt-4">
        <div>
          {canDelete && onDelete && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                onClose();
                onDelete();
              }}
              disabled={isLoading}
              className="gap-1.5"
            >
              <IconTrash className="size-3.5" />
              <span>Eliminar</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
          >
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

export function BucketConfigDialog({
  bucket,
  isOpen,
  onOpenChange,
  onSave,
  onDelete,
  canDelete = false,
}: BucketConfigDialogProps): React.JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-surface sm:max-w-md">
        {isOpen && (
          <BucketFormContent
            bucket={bucket}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
            onDelete={onDelete}
            canDelete={canDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
