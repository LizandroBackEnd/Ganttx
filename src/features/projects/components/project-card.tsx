import Link from "next/link";
import { Badge } from "@/shared/components/ui/badge";
import { IconUsers, IconChecklist } from "@tabler/icons-react";
import type { ProjectDTO } from "../types/project.types";

export interface ProjectCardProps {
  readonly project: ProjectDTO;
}

export function ProjectCard({ project }: ProjectCardProps): React.JSX.Element {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-6 overflow-hidden transition-all duration-300 hover:border-primary/50 hover:bg-surface-elevated hover:shadow-[0_0_25px_-5px_rgba(0,242,142,0.15)] hover:-translate-y-0.5"
    >
      {/* Top subtle accent gradient */}
      <div className="absolute top-0 inset-x-0 h-0.75 bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 opacity-60 group-hover:opacity-100 transition-opacity" />

      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-text-primary group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <Badge
            variant="outline"
            className="text-[10px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          >
            {project.role}
          </Badge>
        </div>

        {project.description && (
          <p className="mt-2 line-clamp-2 text-sm text-text-secondary leading-relaxed">
            {project.description}
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4 text-xs text-text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <IconUsers className="size-3.5 text-primary/80" />
            {project.memberCount} {project.memberCount === 1 ? "miembro" : "miembros"}
          </span>

          <span className="flex items-center gap-1.5 text-text-secondary">
            <IconChecklist className="size-3.5 text-primary/80" />
            {project.taskCount} {project.taskCount === 1 ? "tarea" : "tareas"}
          </span>
        </div>

        <span className="text-[11px] font-mono">
          Actualizado el {new Date(project.updatedAt).toLocaleDateString("es-ES", { month: "short", day: "numeric" })}
        </span>
      </div>
    </Link>
  );
}
