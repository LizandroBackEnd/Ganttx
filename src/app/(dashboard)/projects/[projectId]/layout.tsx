import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById } from "@/features/projects/api/get-project-by-id";
import { ProjectBackButton } from "@/features/projects";
import { Badge } from "@/shared/components/ui/badge";

export interface ProjectLayoutProps {
  readonly children: React.ReactNode;
  readonly params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps): Promise<React.JSX.Element> {
  const { projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Project Subheader */}
      <div className="shrink-0 border-b border-border bg-surface/40 backdrop-blur-xs px-6 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <ProjectBackButton projectId={projectId} />

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Link href="/" className="hover:text-text-primary transition-colors">
                  Proyectos
                </Link>
                <span>/</span>
                <span className="text-text-secondary">{project.name}</span>
              </div>

              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-text-primary">
                  {project.name}
                </h1>
                <Badge
                  variant="outline"
                  className="text-[11px] font-mono uppercase tracking-wider text-text-secondary border-border"
                >
                  {project.currentUserRole}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Content (Full-width for sidebar docking) */}
      <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
