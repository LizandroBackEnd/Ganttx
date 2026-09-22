"use client";

import { useState, useMemo, useCallback } from "react";
import type { CalendarSubViewMode } from "../types/calendar.types";

export interface UseCalendarReturn {
  readonly currentDate: Date;
  readonly viewMode: CalendarSubViewMode;
  readonly setViewMode: (mode: CalendarSubViewMode) => void;
  readonly goToToday: () => void;
  readonly goToPrevious: () => void;
  readonly goToNext: () => void;
  readonly formattedTitle: string;
}

export function useCalendar(initialMode: CalendarSubViewMode = "month"): UseCalendarReturn {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarSubViewMode>(initialMode);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "day") {
        d.setDate(d.getDate() - 1);
      } else if (viewMode === "week") {
        d.setDate(d.getDate() - 7);
      } else if (viewMode === "year") {
        d.setFullYear(d.getFullYear() - 1);
      } else {
        d.setMonth(d.getMonth() - 1);
      }
      return d;
    });
  }, [viewMode]);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "day") {
        d.setDate(d.getDate() + 1);
      } else if (viewMode === "week") {
        d.setDate(d.getDate() + 7);
      } else if (viewMode === "year") {
        d.setFullYear(d.getFullYear() + 1);
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    });
  }, [viewMode]);

  const formattedTitle = useMemo(() => {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("es-ES", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    if (viewMode === "week") {
      const start = new Date(currentDate);
      const day = (start.getDay() + 6) % 7; // Monday = 0
      start.setDate(start.getDate() - day);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      const startMonth = start.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
      const endMonth = end.toLocaleDateString("es-ES", { month: "short", day: "numeric", year: "numeric" });
      return `${startMonth} – ${endMonth}`;
    }

    if (viewMode === "year") {
      return currentDate.getFullYear().toString();
    }

    return currentDate.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
  }, [currentDate, viewMode]);

  return {
    currentDate,
    viewMode,
    setViewMode,
    goToToday,
    goToPrevious,
    goToNext,
    formattedTitle,
  };
}
