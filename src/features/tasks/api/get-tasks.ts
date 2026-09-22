import "server-only";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { TaskDTO } from "../types/task.types";

export interface GetTasksFilter {
  readonly status?: string;
  readonly assigneeId?: string;
}

function formatLocalDateToIsoString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
      customId: true,
      title: true,
      description: true,
      requirement: true,
      sprint: true,
      durationDays: true,
      priority: true,
      status: true,
      startDate: true,
      dueDate: true,
      predecessors: true,
      isEpic: true,
      parentId: true,
      parent: {
        select: {
          id: true,
          title: true,
          customId: true,
        },
      },
      _count: {
        select: {
          subtasks: true,
        },
      },
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
      { isEpic: "desc" },
      { startDate: "asc" },
      { createdAt: "asc" },
    ],
  });

  return tasks.map((t) => ({
    id: t.id,
    customId: t.customId,
    title: t.title,
    description: t.description,
    requirement: t.requirement,
    sprint: t.sprint,
    durationDays: t.durationDays,
    priority: t.priority,
    status: t.status,
    startDate: formatLocalDateToIsoString(t.startDate),
    dueDate: formatLocalDateToIsoString(t.dueDate),
    predecessors: t.predecessors,
    isEpic: t.isEpic,
    parentId: t.parentId,
    parent: t.parent
      ? {
          id: t.parent.id,
          title: t.parent.title,
          customId: t.parent.customId,
        }
      : null,
    subtasksCount: t._count.subtasks,
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
      customId: true,
      title: true,
      description: true,
      requirement: true,
      sprint: true,
      durationDays: true,
      priority: true,
      status: true,
      startDate: true,
      dueDate: true,
      predecessors: true,
      isEpic: true,
      parentId: true,
      parent: {
        select: {
          id: true,
          title: true,
          customId: true,
        },
      },
      _count: {
        select: {
          subtasks: true,
        },
      },
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
    customId: task.customId,
    title: task.title,
    description: task.description,
    requirement: task.requirement,
    sprint: task.sprint,
    durationDays: task.durationDays,
    priority: task.priority,
    status: task.status,
    startDate: formatLocalDateToIsoString(task.startDate),
    dueDate: formatLocalDateToIsoString(task.dueDate),
    predecessors: task.predecessors,
    isEpic: task.isEpic,
    parentId: task.parentId,
    parent: task.parent
      ? {
          id: task.parent.id,
          title: task.parent.title,
          customId: task.parent.customId,
        }
      : null,
    subtasksCount: task._count.subtasks,
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
