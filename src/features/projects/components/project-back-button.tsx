"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";

export interface ProjectBackButtonProps {
  readonly projectId: string;
}

export function ProjectBackButton({
  projectId,
}: ProjectBackButtonProps): React.JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isSettings = pathname.endsWith("/settings");
  const fromView = searchParams.get("from") ?? searchParams.get("view") ?? "tasks";

  const backHref = isSettings
    ? `/projects/${projectId}?view=${encodeURIComponent(fromView)}`
    : "/";

  const ariaLabel = isSettings
    ? "Volver a la vista previa del proyecto"
    : "Volver a la lista de proyectos";

  return (
    <Link
      href={backHref}
      aria-label={ariaLabel}
      className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:bg-surface-elevated hover:text-text-primary hover:border-primary/40 transition-all shadow-xs shrink-0"
    >
      <IconArrowLeft className="size-4" />
    </Link>
  );
}
