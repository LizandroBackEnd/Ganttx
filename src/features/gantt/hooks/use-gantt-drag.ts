"use client";

import { useState, useCallback, useEffect } from "react";
import { updateTaskDates } from "@/features/tasks";
import type { GanttDragMode, GanttDragState } from "../types/gantt.types";

export interface UseGanttDragOptions {
  readonly columnWidthPx: number;
  readonly onDatesUpdated?: () => void;
}

function addDaysToIsoString(dateString: string, daysToAdd: number): string {
  const d = new Date(`${dateString}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  return d.toISOString().split("T")[0] ?? dateString;
}

export function useGanttDrag({
  columnWidthPx,
  onDatesUpdated,
}: UseGanttDragOptions) {
  const [dragState, setDragState] = useState<GanttDragState | null>(null);

  const startDrag = useCallback(
    (
      taskId: string,
      mode: GanttDragMode,
      clientX: number,
      originalStartDate: string,
      originalDueDate: string
    ): void => {
      setDragState({
        taskId,
        mode,
        initialClientX: clientX,
        currentDeltaDays: 0,
        originalStartDate,
        originalDueDate,
      });
    },
    []
  );

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent): void => {
      const deltaX = e.clientX - dragState.initialClientX;
      const deltaDays = Math.round(deltaX / columnWidthPx);
      setDragState((prev) => (prev ? { ...prev, currentDeltaDays: deltaDays } : null));
    };

    const handleMouseUp = async (): Promise<void> => {
      const state = dragState;
      setDragState(null);

      if (!state || state.currentDeltaDays === 0) {
        return;
      }

      let newStart = state.originalStartDate;
      let newDue = state.originalDueDate;

      if (state.mode === "move") {
        newStart = addDaysToIsoString(state.originalStartDate, state.currentDeltaDays);
        newDue = addDaysToIsoString(state.originalDueDate, state.currentDeltaDays);
      } else if (state.mode === "resize-start") {
        newStart = addDaysToIsoString(state.originalStartDate, state.currentDeltaDays);
        if (newStart > newDue) {
          newStart = newDue;
        }
      } else if (state.mode === "resize-end") {
        newDue = addDaysToIsoString(state.originalDueDate, state.currentDeltaDays);
        if (newDue < newStart) {
          newDue = newStart;
        }
      }

      try {
        await updateTaskDates({
          taskId: state.taskId,
          startDate: newStart,
          dueDate: newDue,
        });
        onDatesUpdated?.();
      } catch {
        // failed to update
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, columnWidthPx, onDatesUpdated]);

  return {
    dragState,
    startDrag,
  };
}
