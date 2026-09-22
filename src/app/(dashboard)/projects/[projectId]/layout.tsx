import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById } from "@/features/projects/api/get-project-by-id";
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
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* Project Subheader */}
      <div className="border-b border-border bg-surface/40 backdrop-blur-xs px-6 py-4">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Link href="/" className="hover:text-text-primary transition-colors">
                Projects
              </Link>
              <span>/</span>
              <span className="text-text-secondary">{project.name}</span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">
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

          {/* Navigation Links */}
          <div className="flex items-center gap-1 self-start md:self-auto border border-border/80 rounded-lg p-1 bg-surface-elevated/40">
            <Link
              href={`/projects/${projectId}`}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-elevated transition-colors"
            >
              Tasks & Views
            </Link>
            <Link
              href={`/projects/${projectId}/settings`}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              Members & Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Project Content */}
      <div className="flex-1 mx-auto w-full max-w-7xl px-6 py-6">
        {children}
      </div>
    </div>
  );
}
