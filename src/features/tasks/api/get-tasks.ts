import "server-only";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { TaskDTO } from "../types/task.types";
import type { TaskStatus } from "@/lib/constants";

export interface GetTasksFilter {
  readonly status?: TaskStatus;
  readonly assigneeId?: string;
}

function formatDateToIsoString(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

export async function getTasksByProjectId(
  projectId: string,
  filter?: GetTasksFilter
): Promise<TaskDTO[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const userId = session.user.id;

  // Check membership
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
    select: { role: true },
  });

  if (!member) {
    return [];
  }

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.assigneeId ? { assigneeId: filter.assigneeId } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      status: true,
      progress: true,
      startDate: true,
      dueDate: true,
      projectId: true,
      assigneeId: true,
      creatorId: true,
      createdAt: true,
      updatedAt: true,
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: [
      { startDate: "asc" },
      { createdAt: "asc" },
    ],
  });

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    progress: t.progress,
    startDate: formatDateToIsoString(t.startDate),
    dueDate: formatDateToIsoString(t.dueDate),
    projectId: t.projectId,
    assigneeId: t.assigneeId,
    creatorId: t.creatorId,
    assignee: t.assignee
      ? {
          id: t.assignee.id,
          name: t.assignee.name,
          email: t.assignee.email,
          image: t.assignee.image,
        }
      : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
}

export async function getTaskById(taskId: string): Promise<TaskDTO | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      status: true,
      progress: true,
      startDate: true,
      dueDate: true,
      projectId: true,
      assigneeId: true,
      creatorId: true,
      createdAt: true,
      updatedAt: true,
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      project: {
        select: {
          members: {
            where: { userId },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!task || task.project.members.length === 0) {
    return null;
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    progress: task.progress,
    startDate: formatDateToIsoString(task.startDate),
    dueDate: formatDateToIsoString(task.dueDate),
    projectId: task.projectId,
    assigneeId: task.assigneeId,
    creatorId: task.creatorId,
    assignee: task.assignee
      ? {
          id: task.assignee.id,
          name: task.assignee.name,
          email: task.assignee.email,
          image: task.assignee.image,
        }
      : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
