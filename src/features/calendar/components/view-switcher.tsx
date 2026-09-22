"use client";

import type { CalendarViewMode } from "../types/calendar.types";

export interface ViewSwitcherProps {
  readonly currentView: CalendarViewMode;
  readonly onViewChange: (view: CalendarViewMode) => void;
}

const views: { id: CalendarViewMode; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
  { id: "year", label: "Year" },
  { id: "tasks", label: "Tasks" },
  { id: "gantt", label: "Gantt Timeline" },
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
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
            }`}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
