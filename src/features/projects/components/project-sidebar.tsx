"use client";

import Link from "next/link";
import { IconListCheck, IconCalendar, IconTimeline, IconSettings } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export type WorkspacePrimaryView = "tasks" | "calendar" | "gantt";
export type CalendarSubMode = "month" | "week" | "day" | "year";

export interface ProjectSidebarProps {
  readonly projectId: string;
  readonly primaryView: WorkspacePrimaryView;
  readonly calendarSubMode: CalendarSubMode;
  readonly onSelectPrimaryView: (view: WorkspacePrimaryView) => void;
  readonly onSelectCalendarSubMode: (subMode: CalendarSubMode) => void;
  readonly taskCount: number;
}

const calendarSubOptions: { id: CalendarSubMode; label: string }[] = [
  { id: "month", label: "Mes" },
  { id: "week", label: "Semana" },
  { id: "day", label: "Día" },
  { id: "year", label: "Año" },
];

export function ProjectSidebar({
  projectId,
  primaryView,
  calendarSubMode,
  onSelectPrimaryView,
  onSelectCalendarSubMode,
  taskCount,
}: ProjectSidebarProps): React.JSX.Element {
  return (
    <aside className="w-full md:w-64 shrink-0 min-h-[calc(100vh-7.5rem)] border-b md:border-b-0 md:border-r border-border bg-surface/50 backdrop-blur-xs p-4 flex flex-col justify-between">
      <div className="flex flex-col gap-1.5">
        <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Vistas del Proyecto
        </div>

        {/* 1. Tareas (Primera Opción) */}
        <button
          type="button"
          onClick={() => onSelectPrimaryView("tasks")}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all text-left",
            primaryView === "tasks"
              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
              : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
          )}
        >
          <div className="flex items-center gap-2.5">
            <IconListCheck className="size-4 shrink-0" />
            <span>Tareas</span>
          </div>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-mono font-semibold",
              primaryView === "tasks"
                ? "bg-black/20 text-primary-foreground"
                : "bg-surface-elevated text-text-muted"
            )}
          >
            {taskCount}
          </span>
        </button>

        {/* 2. Calendario (Segunda Opción con Mes, Semana, Día, Año) */}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onSelectPrimaryView("calendar")}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all text-left",
              primaryView === "calendar"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            )}
          >
            <div className="flex items-center gap-2.5">
              <IconCalendar className="size-4 shrink-0" />
              <span>Calendario</span>
            </div>
          </button>

          {/* Sub-opciones de Calendario cuando está activo */}
          {primaryView === "calendar" && (
            <div className="ml-4 pl-3.5 border-l border-border/80 flex flex-col gap-1 py-1">
              {calendarSubOptions.map((sub) => {
                const isSubActive = calendarSubMode === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onSelectCalendarSubMode(sub.id)}
                    className={cn(
                      "flex items-center rounded-lg px-2.5 py-1.5 text-xs transition-colors text-left",
                      isSubActive
                        ? "bg-surface-elevated text-primary font-semibold shadow-2xs"
                        : "text-text-muted hover:text-text-primary hover:bg-surface-elevated/50"
                    )}
                  >
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Cronograma Gantt (Última Opción) */}
        <button
          type="button"
          onClick={() => onSelectPrimaryView("gantt")}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all text-left",
            primaryView === "gantt"
              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
              : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
          )}
        >
          <IconTimeline className="size-4 shrink-0" />
          <span>Cronograma</span>
        </button>
      </div>

      {/* Sidebar Footer: Quick link to settings */}
      <div className="pt-4 border-t border-border/60">
        <Link
          href={`/projects/${projectId}/settings?from=${primaryView}`}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
        >
          <IconSettings className="size-4 shrink-0 text-text-muted" />
          <span>Ajustes del Proyecto</span>
        </Link>
      </div>
    </aside>
  );
}
