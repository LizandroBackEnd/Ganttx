"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export interface ProjectNavTabsProps {
  readonly projectId: string;
}

export function ProjectNavTabs({
  projectId,
}: ProjectNavTabsProps): React.JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSettings = pathname.endsWith("/settings");

  const currentView = searchParams.get("view") ?? "tasks";
  const fromView = searchParams.get("from") ?? currentView;

  const workspaceHref = isSettings
    ? `/projects/${projectId}?view=${encodeURIComponent(fromView)}`
    : `/projects/${projectId}?view=${encodeURIComponent(currentView)}`;

  const settingsHref = `/projects/${projectId}/settings?from=${encodeURIComponent(
    isSettings ? fromView : currentView
  )}`;

  return (
    <nav
      aria-label="Vistas del proyecto"
      className="flex items-center gap-1 self-start md:self-auto border border-border/80 rounded-lg p-1 bg-surface-elevated/40"
    >
      <Link
        href={workspaceHref}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          !isSettings
            ? "bg-surface text-text-primary shadow-xs font-semibold"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated/60"
        )}
      >
        Tareas y Vistas
      </Link>
      <Link
        href={settingsHref}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          isSettings
            ? "bg-surface text-text-primary shadow-xs font-semibold"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated/60"
        )}
      >
        Miembros y Ajustes
      </Link>
    </nav>
  );
}
