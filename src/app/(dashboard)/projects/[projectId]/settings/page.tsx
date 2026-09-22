import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectById } from "@/features/projects/api/get-project-by-id";
import {
  ProjectMembersTable,
  ProjectSettingsForm,
} from "@/features/projects";

export interface ProjectSettingsPageProps {
  readonly params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectSettingsPage({
  params,
}: ProjectSettingsPageProps): Promise<React.JSX.Element> {
  const { projectId } = await params;
  const [project, session] = await Promise.all([
    getProjectById(projectId),
    auth(),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Project Settings & Team
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Configure project details, manage access, and invite collaborators.
        </p>
      </div>

      <ProjectMembersTable
        projectId={projectId}
        members={project.members}
        currentUserRole={project.currentUserRole}
        currentUserId={session?.user?.id}
      />

      <ProjectSettingsForm
        projectId={projectId}
        initialName={project.name}
        initialDescription={project.description}
        currentUserRole={project.currentUserRole}
      />
    </div>
  );
}
