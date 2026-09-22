import { getProjects } from "@/features/projects/api/get-projects";
import { ProjectCard, CreateProjectDialog } from "@/features/projects";
import { IconFolders } from "@tabler/icons-react";

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const projects = await getProjects();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Projects
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your project workspaces, timelines, and team members.
          </p>
        </div>

        <CreateProjectDialog />
      </div>

      {/* Projects Grid or Empty State */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-100 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-surface/30 p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-elevated text-primary mb-4 border border-border">
            <IconFolders className="size-7" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary">
            No projects yet
          </h2>
          <p className="mt-2 max-w-sm text-sm text-text-secondary">
            Get started by creating your first project workspace to track milestones, tasks, and visual Gantt charts.
          </p>
          <div className="mt-6">
            <CreateProjectDialog />
          </div>
        </div>
      )}
    </div>
  );
}
