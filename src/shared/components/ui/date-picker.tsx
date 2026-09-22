"use client";

import { useState, useMemo, useId } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  readonly id?: string;
  readonly value: string; // ISO format "YYYY-MM-DD"
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly className?: string;
}

const dayNames = ["L", "M", "X", "J", "V", "S", "D"];

function formatIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIso(isoString: string): { year: number; month: number; day: number } | null {
  if (!isoString) return null;
  const parts = isoString.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]!) || isNaN(parts[1]!) || isNaN(parts[2]!)) {
    return null;
  }
  return { year: parts[0]!, month: parts[1]! - 1, day: parts[2]! };
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Seleccionar fecha...",
  disabled = false,
  className,
}: DatePickerProps): React.JSX.Element {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const selectedParsed = useMemo(() => parseIso(value), [value]);

  // Current viewing month and year in calendar
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (selectedParsed) {
      return new Date(selectedParsed.year, selectedParsed.month, 1);
    }
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthName = useMemo(() => {
    return new Date(year, month, 1).toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
  }, [year, month]);

  // Calendar cells
  const cells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
    const totalDays = lastDayOfMonth.getDate();

    const today = new Date();
    const todayIso = formatIso(today.getFullYear(), today.getMonth(), today.getDate());

    const result: {
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateString = formatIso(prevYear, prevMonth, dayNum);

      result.push({
        dateString,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateString === todayIso,
        isSelected: dateString === value,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateString = formatIso(year, month, d);
      result.push({
        dateString,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateString === todayIso,
        isSelected: dateString === value,
      });
    }

    // Next month padding to complete 35 or 42 grid items
    const remaining = (7 - (result.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateString = formatIso(nextYear, nextMonth, i);

      result.push({
        dateString,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateString === todayIso,
        isSelected: dateString === value,
      });
    }

    return result;
  }, [year, month, value]);

  const handlePrevMonth = (): void => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (): void => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelect = (dateString: string): void => {
    onChange(dateString);
    setIsOpen(false);
  };

  const handleToday = (): void => {
    const today = new Date();
    const todayIso = formatIso(today.getFullYear(), today.getMonth(), today.getDate());
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    onChange(todayIso);
    setIsOpen(false);
  };

  const handleClear = (): void => {
    onChange("");
    setIsOpen(false);
  };

  const formattedDisplay = useMemo(() => {
    if (!selectedParsed) return "";
    const date = new Date(selectedParsed.year, selectedParsed.month, selectedParsed.day);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [selectedParsed]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          id={inputId}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-xs text-text-primary transition-all hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed",
            !value && "text-text-muted",
            className
          )}
        >
          <span className="truncate">{formattedDisplay || placeholder}</span>
          <IconCalendar className="size-4 text-text-muted shrink-0 ml-2" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-68 p-3" align="start">
        {/* Calendar Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Mes anterior"
            className="flex size-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
          >
            <IconChevronLeft className="size-4" />
          </button>

          <span className="text-xs font-semibold capitalize text-text-primary">
            {monthName}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Mes siguiente"
            className="flex size-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
          >
            <IconChevronRight className="size-4" />
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center py-2 text-[11px] font-semibold text-text-muted">
          {dayNames.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Grid Days */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => (
            <button
              key={cell.dateString}
              type="button"
              onClick={() => handleSelect(cell.dateString)}
              className={cn(
                "flex size-7.5 items-center justify-center rounded-md text-xs font-mono transition-all",
                cell.isSelected
                  ? "bg-gradient-to-r from-[#00f28e] to-[#00d47e] text-[#04120a] font-bold shadow-[0_0_12px_rgba(0,242,142,0.35)] scale-105"
                  : cell.isToday
                  ? "border border-primary/50 text-primary font-semibold hover:bg-surface-elevated"
                  : cell.isCurrentMonth
                  ? "text-text-primary hover:bg-surface-elevated"
                  : "text-text-muted/40 hover:bg-surface-elevated/40"
              )}
            >
              {cell.dayNumber}
            </button>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleClear}
            className="text-text-muted hover:text-rose-400 text-[11px]"
          >
            Borrar
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleToday}
            className="text-primary hover:text-primary-hover font-semibold text-[11px]"
          >
            Hoy
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
