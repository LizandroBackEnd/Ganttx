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
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 mb-1 inline-block">
            Espacio de Trabajo
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Tus <span className="text-gradient-emerald">Proyectos</span>
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Administra tus espacios de trabajo, cronogramas y miembros del equipo.
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
        <div className="flex min-h-100 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-surface/30 p-12 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -z-10" />
          <div className="flex size-16 items-center justify-center rounded-2xl bg-surface-elevated text-emerald-400 mb-4 border border-emerald-500/30 shadow-[0_0_20px_rgba(0,242,142,0.15)]">
            <IconFolders className="size-8" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary">
            Aún no hay proyectos
          </h2>
          <p className="mt-2 max-w-sm text-sm text-text-secondary">
            Comienza creando tu primer espacio de trabajo para planificar hitos, tareas y diagramas de Gantt visuales.
          </p>
          <div className="mt-6">
            <CreateProjectDialog />
          </div>
        </div>
      )}
    </div>
  );
}
