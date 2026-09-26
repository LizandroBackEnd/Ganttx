import { notFound } from "next/navigation";
import { getProjectById } from "@/features/projects/api/get-project-by-id";
import { ProjectWorkspace } from "@/features/projects";
import { getTasksByProjectId } from "@/features/tasks/api/get-tasks";

export interface ProjectPageProps {
  readonly params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectPage({
  params,
}: ProjectPageProps): Promise<React.JSX.Element> {
  const { projectId } = await params;

  const [project, tasks] = await Promise.all([
    getProjectById(projectId),
    getTasksByProjectId(projectId),
  ]);

  if (!project) {
    notFound();
  }

  const memberOptions = project.members.map((m) => ({
    id: m.userId,
    name: m.name,
    email: m.email,
    image: m.image,
  }));

  return (
    <ProjectWorkspace
      project={project}
      tasks={tasks}
      members={memberOptions}
    />
  );
}
