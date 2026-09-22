"use client";

import type { CalendarSubViewMode } from "../types/calendar.types";

export interface ViewSwitcherProps {
  readonly currentView: CalendarSubViewMode;
  readonly onViewChange: (view: CalendarSubViewMode) => void;
}

const views: { id: CalendarSubViewMode; label: string }[] = [
  { id: "month", label: "Mes" },
  { id: "week", label: "Semana" },
  { id: "day", label: "Día" },
  { id: "year", label: "Año" },
];

export function ViewSwitcher({
  currentView,
  onViewChange,
}: ViewSwitcherProps): React.JSX.Element {
  return (
    <div className="flex items-center rounded-xl border border-border bg-surface p-1 shadow-sm overflow-x-auto no-scrollbar">
      {views.map((view) => {
        const isActive = currentView === view.id;
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onViewChange(view.id)}
            className={`rounded-lg px-3 py-1 text-xs transition-all whitespace-nowrap ${
              isActive
                ? "bg-primary text-primary-foreground font-semibold shadow-xs scale-[1.02]"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated font-medium"
            }`}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
