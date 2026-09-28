"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconListCheck,
  IconCalendar,
  IconTimeline,
  IconSettings,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export type WorkspacePrimaryView = "tasks" | "calendar" | "gantt";
export type CalendarSubMode = "month" | "week" | "day" | "year";

export interface ProjectSidebarProps {
  readonly projectId: string;
  readonly primaryView: WorkspacePrimaryView;
  readonly onSelectPrimaryView: (view: WorkspacePrimaryView) => void;
  readonly taskCount: number;
  readonly calendarSubMode?: CalendarSubMode;
  readonly onSelectCalendarSubMode?: (subMode: CalendarSubMode) => void;
}

const NAV_ITEMS = [
  {
    id: "calendar" as WorkspacePrimaryView,
    label: "Calendario",
    Icon: IconCalendar,
  },
  {
    id: "tasks" as WorkspacePrimaryView,
    label: "Tareas",
    Icon: IconListCheck,
  },
  {
    id: "gantt" as WorkspacePrimaryView,
    label: "Cronograma",
    Icon: IconTimeline,
  },
] as const;

export function ProjectSidebar({
  projectId,
  primaryView,
  onSelectPrimaryView,
  taskCount,
}: ProjectSidebarProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "shrink-0 h-full border-b md:border-b-0 md:border-r border-border bg-surface/50 backdrop-blur-xs flex flex-col justify-between overflow-y-auto transition-all duration-200",
        collapsed ? "w-14 p-2" : "w-full md:w-56 p-4"
      )}
    >
      <div className="flex flex-col gap-1">
        {/* Toggle button */}
        <div
          className={cn(
            "flex mb-1",
            collapsed ? "justify-center" : "justify-end"
          )}
        >
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex size-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-elevated hover:text-text-primary transition-colors"
            title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {collapsed ? (
              <IconLayoutSidebarLeftExpand className="size-4" />
            ) : (
              <IconLayoutSidebarLeftCollapse className="size-4" />
            )}
          </button>
        </div>

        {/* Section label — only visible when expanded */}
        {!collapsed && (
          <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Vistas del Proyecto
          </div>
        )}

        {/* Nav items */}
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = primaryView === id;
          const showBadge = id === "tasks";

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectPrimaryView(id)}
              title={collapsed ? label : undefined}
              className={cn(
                "flex w-full items-center rounded-xl text-xs font-medium transition-all text-left",
                collapsed
                  ? "justify-center size-10 mx-auto p-0"
                  : "gap-2.5 px-3 py-2.5 justify-between",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
              )}
            >
              <div className={cn("flex items-center", !collapsed && "gap-2.5")}>
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </div>

              {/* Task count badge — only when expanded */}
              {showBadge && !collapsed && (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-mono font-semibold",
                    isActive
                      ? "bg-black/20 text-primary-foreground"
                      : "bg-surface-elevated text-text-muted"
                  )}
                >
                  {taskCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer: Settings */}
      <div className={cn("pt-4 border-t border-border/60", collapsed && "pt-2")}>
        <Link
          href={`/projects/${projectId}/settings?from=${primaryView}`}
          title={collapsed ? "Ajustes del Proyecto" : undefined}
          className={cn(
            "flex items-center rounded-xl text-xs font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors",
            collapsed
              ? "justify-center size-10 mx-auto p-0"
              : "gap-2.5 px-3 py-2"
          )}
        >
          <IconSettings className="size-4 shrink-0 text-text-muted" />
          {!collapsed && <span>Ajustes del Proyecto</span>}
        </Link>
      </div>
    </aside>
  );
}
