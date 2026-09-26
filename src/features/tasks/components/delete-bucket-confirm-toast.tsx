"use client";

import { useState } from "react";
import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export const SKIP_BUCKET_DELETE_KEY = "ganttx_skip_bucket_delete_confirm";

export interface DeleteBucketConfirmToastProps {
  readonly bucketLabel: string;
  readonly onConfirm: (dontAskAgain: boolean) => void;
  readonly onCancel: () => void;
}

export function DeleteBucketConfirmToast({
  bucketLabel,
  onConfirm,
  onCancel,
}: DeleteBucketConfirmToastProps): React.JSX.Element {
  const [dontAskAgain, setDontAskAgain] = useState<boolean>(false);

  return (
    <div
      className="flex flex-col gap-3 pt-1 text-xs select-none"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[13px] leading-snug font-medium text-(--sileo-card-text)">
        ¿Estás seguro de que querés eliminar el bucket{" "}
        <strong className="font-bold text-(--sileo-card-text) underline decoration-amber-500 decoration-2 underline-offset-2">
          &ldquo;{bucketLabel}&rdquo;
        </strong>
        ?
      </p>

      {/* "No volver a preguntar" option */}
      <div
        role="checkbox"
        aria-checked={dontAskAgain}
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDontAskAgain((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            setDontAskAgain((prev) => !prev);
          }
        }}
        className="flex items-center gap-2.5 cursor-pointer py-1 group outline-none"
      >
        <span
          className={cn(
            "size-4.5 rounded-md border flex items-center justify-center transition-all shrink-0 shadow-2xs",
            dontAskAgain
              ? "bg-rose-600 border-rose-600 text-white"
              : "bg-(--sileo-card-input-bg) border-(--sileo-card-input-border) group-hover:border-(--sileo-card-text)"
          )}
        >
          {dontAskAgain && <IconCheck className="size-3.5 stroke-3 text-white" />}
        </span>
        <span className="text-[12px] font-semibold text-(--sileo-card-text-muted) group-hover:text-(--sileo-card-text) transition-colors">
          No volver a preguntar
        </span>
      </div>

      {/* Confirmation Actions */}
      <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-(--sileo-card-border)">
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
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-(--sileo-card-text-muted) hover:text-(--sileo-card-text) hover:bg-(--sileo-card-bg-subtle) cursor-pointer transition-colors"
        >
          Cancelar
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onConfirm(dontAskAgain);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onConfirm(dontAskAgain);
            }
          }}
          className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-xs cursor-pointer transition-all"
        >
          Eliminar
        </span>
      </div>
    </div>
  );
}
