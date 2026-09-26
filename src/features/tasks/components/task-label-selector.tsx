"use client";

import React, { useState } from "react";
import {
  IconCheck,
  IconX,
  IconChevronDown,
  IconSettings,
  IconPlus,
} from "@tabler/icons-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CustomPriorityOption } from "../types/task.types";

export interface TaskLabelSelectorProps {
  readonly selectedLabels: readonly string[];
  readonly onChange: (labels: string[]) => void;
  readonly priorities: readonly CustomPriorityOption[];
  readonly onOpenConfig?: () => void;
  readonly placeholder?: string;
  readonly className?: string;
  readonly compact?: boolean;
  readonly disabled?: boolean;
}

export function TaskLabelSelector({
  selectedLabels,
  onChange,
  priorities,
  onOpenConfig,
  placeholder = "Seleccionar etiquetas...",
  className,
  compact = false,
  disabled = false,
}: TaskLabelSelectorProps): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(false);

  const handleToggle = (id: string): void => {
    const isSelected = selectedLabels.some(
      (l) => l.toUpperCase() === id.toUpperCase()
    );
    if (isSelected) {
      onChange(selectedLabels.filter((l) => l.toUpperCase() !== id.toUpperCase()));
    } else {
      onChange([...selectedLabels, id]);
    }
  };

  const handleRemove = (e: React.MouseEvent, id: string): void => {
    e.stopPropagation();
    onChange(selectedLabels.filter((l) => l.toUpperCase() !== id.toUpperCase()));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((prev) => !prev);
            }
          }}
          className={cn(
            "group flex items-center justify-between gap-1.5 transition-colors cursor-pointer select-none text-left",
            compact
              ? "h-7 min-w-24 max-w-full rounded-lg border border-border bg-background px-2 text-[11px]"
              : "min-h-9 w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs",
            open && "border-primary/60 ring-1 ring-primary/30",
            disabled && "opacity-50 pointer-events-none cursor-not-allowed",
            className
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            {selectedLabels.length === 0 ? (
              <span className="text-text-muted truncate">{placeholder}</span>
            ) : (
              selectedLabels.map((lblId) => {
                const pr = priorities.find(
                  (p) =>
                    p.id === lblId ||
                    p.label.toUpperCase() === lblId.toUpperCase()
                );
                const display = pr?.label ?? lblId;
                const color = pr?.color || "#0284c7";

                return (
                  <span
                    key={lblId}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md font-mono uppercase tracking-wider border font-medium transition-colors",
                      compact
                        ? "text-[9px] px-1.5 py-0.2"
                        : "text-[10px] px-2 py-0.5"
                    )}
                    style={{
                      backgroundColor: `${color}1f`,
                      borderColor: `${color}4d`,
                      color: color,
                    }}
                  >
                    <span className="truncate max-w-24">{display}</span>
                    {!disabled && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleRemove(e, lblId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleRemove(e as unknown as React.MouseEvent, lblId);
                          }
                        }}
                        className="opacity-70 hover:opacity-100 hover:text-white transition-opacity ml-0.5"
                        title={`Quitar ${display}`}
                      >
                        <IconX className={compact ? "size-2.5" : "size-3"} />
                      </span>
                    )}
                  </span>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 text-text-muted group-hover:text-text-primary transition-colors">
            {!compact && selectedLabels.length > 0 && (
              <span className="text-[10px] text-text-muted hover:text-primary flex items-center gap-0.5 mr-0.5">
                <IconPlus className="size-3" />
              </span>
            )}
            <IconChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-56 p-1.5 z-100 bg-surface border-border shadow-xl rounded-xl"
      >
        <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto">
          {priorities.map((pr) => {
            const isSelected = selectedLabels.some(
              (l) => l.toUpperCase() === pr.id.toUpperCase()
            );
            const prColor = pr.color || "#0284c7";

            return (
              <button
                key={pr.id}
                type="button"
                onClick={() => handleToggle(pr.id)}
                className={cn(
                  "flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors text-left",
                  isSelected
                    ? "bg-surface-elevated text-text-primary font-medium"
                    : "text-text-secondary hover:bg-surface-elevated/60 hover:text-text-primary"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: prColor }}
                  />
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border"
                    style={{
                      backgroundColor: `${prColor}1f`,
                      borderColor: `${prColor}4d`,
                      color: prColor,
                    }}
                  >
                    {pr.label}
                  </span>
                </div>

                {isSelected && (
                  <IconCheck className="size-3.5 text-primary stroke-[2.5] shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {onOpenConfig && (
          <div className="pt-1.5 mt-1.5 border-t border-border/50">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenConfig();
              }}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] text-primary hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
            >
              <IconSettings className="size-3" />
              <span>Personalizar etiquetas</span>
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
