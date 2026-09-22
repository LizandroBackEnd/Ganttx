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
      className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-6 transition-all hover:border-primary/40 hover:bg-surface-elevated hover:shadow-lg hover:shadow-primary/5"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-text-primary group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <Badge
            variant="outline"
            className="text-[11px] font-mono uppercase tracking-wider text-text-secondary border-border"
          >
            {project.role}
          </Badge>
        </div>

        {project.description && (
          <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
            {project.description}
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4 text-xs text-text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <IconUsers className="size-3.5" />
            {project.memberCount} {project.memberCount === 1 ? "member" : "members"}
          </span>

          <span className="flex items-center gap-1.5">
            <IconChecklist className="size-3.5" />
            {project.taskCount} {project.taskCount === 1 ? "task" : "tasks"}
          </span>
        </div>

        <span>
          Updated {new Date(project.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      </div>
    </Link>
  );
}
