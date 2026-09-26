"use client";

import React from "react";

export interface CompleteTaskConfirmToastProps {
  readonly taskTitle: string;
  readonly pendingSubtasksCount: number;
  readonly onCompleteAll: () => void;
  readonly onCancel: () => void;
}

export function CompleteTaskConfirmToast({
  taskTitle,
  pendingSubtasksCount,
  onCompleteAll,
  onCancel,
}: CompleteTaskConfirmToastProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-2.5 pt-1 text-xs select-none"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[12px] leading-snug font-medium text-(--sileo-card-text)">
        La tarea{" "}
        <strong className="font-bold text-(--sileo-card-text)">
          &ldquo;{taskTitle}&rdquo;
        </strong>{" "}
        tiene{" "}
        <strong className="text-primary font-semibold">
          {pendingSubtasksCount}
        </strong>{" "}
        subtarea{pendingSubtasksCount > 1 ? "s" : ""} pendiente
        {pendingSubtasksCount > 1 ? "s" : ""}. ¿Deseas completarlas también?
      </p>

      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-(--sileo-card-border)">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }
          }}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-(--sileo-card-text-muted) hover:text-(--sileo-card-text) hover:bg-(--sileo-card-bg-subtle) cursor-pointer transition-colors"
        >
          Cancelar
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCompleteAll();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onCompleteAll();
            }
          }}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer transition-colors"
        >
          Completar todo
        </span>
      </div>
    </div>
  );
}
