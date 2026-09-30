import "server-only";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { TaskDTO } from "../types/task.types";

export interface GetTasksFilter {
  readonly bucket?: string;
  readonly status?: string; // backwards compatibility
  readonly assigneeId?: string;
}

function formatLocalDateToIsoString(date: Date | null | undefined): string | null {
  if (!date) return null;
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

  const activeBucket = filter?.bucket ?? filter?.status;

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      ...(activeBucket ? { bucket: activeBucket } : {}),
      ...(filter?.assigneeId ? { assigneeId: filter.assigneeId } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      label: true,
      bucket: true,
      startDate: true,
      dueDate: true,
      predecessors: true,
      isEpic: true,
      showSubtasksOnCard: true,
      parentId: true,
      parent: {
        select: {
          id: true,
          title: true,
          startDate: true,
          dueDate: true,
        },
      },
      _count: {
        select: {
          subtasks: true,
        },
      },
      subtasks: {
        select: {
          id: true,
          title: true,
          bucket: true,
          showSubtasksOnCard: true,
          assigneeId: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
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
    title: t.title,
    description: t.description,
    label: t.label,
    bucket: t.bucket,
    startDate: formatLocalDateToIsoString(t.startDate),
    dueDate: formatLocalDateToIsoString(t.dueDate),
    predecessors: t.predecessors,
    isEpic: t.isEpic,
    showSubtasksOnCard: t.showSubtasksOnCard,
    subtasks: t.subtasks.map((st) => ({
      id: st.id,
      title: st.title,
      bucket: st.bucket,
      showSubtasksOnCard: st.showSubtasksOnCard,
      assigneeId: st.assigneeId,
      assignee: st.assignee
        ? {
            id: st.assignee.id,
            name: st.assignee.name,
            email: st.assignee.email,
            image: st.assignee.image,
          }
        : null,
    })),
    parentId: t.parentId,
    parent: t.parent
      ? {
          id: t.parent.id,
          title: t.parent.title,
          startDate: formatLocalDateToIsoString(t.parent.startDate),
          dueDate: formatLocalDateToIsoString(t.parent.dueDate),
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
      title: true,
      description: true,
      label: true,
      bucket: true,
      startDate: true,
      dueDate: true,
      predecessors: true,
      isEpic: true,
      showSubtasksOnCard: true,
      parentId: true,
      parent: {
        select: {
          id: true,
          title: true,
          startDate: true,
          dueDate: true,
        },
      },
      _count: {
        select: {
          subtasks: true,
        },
      },
      subtasks: {
        select: {
          id: true,
          title: true,
          bucket: true,
          showSubtasksOnCard: true,
          assigneeId: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
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
    title: task.title,
    description: task.description,
    label: task.label,
    bucket: task.bucket,
    startDate: formatLocalDateToIsoString(task.startDate),
    dueDate: formatLocalDateToIsoString(task.dueDate),
    predecessors: task.predecessors,
    isEpic: task.isEpic,
    showSubtasksOnCard: task.showSubtasksOnCard,
    subtasks: task.subtasks.map((st) => ({
      id: st.id,
      title: st.title,
      bucket: st.bucket,
      showSubtasksOnCard: st.showSubtasksOnCard,
      assigneeId: st.assigneeId,
      assignee: st.assignee
        ? {
            id: st.assignee.id,
            name: st.assignee.name,
            email: st.assignee.email,
            image: st.assignee.image,
          }
        : null,
    })),
    parentId: task.parentId,
    parent: task.parent
      ? {
          id: task.parent.id,
          title: task.parent.title,
          startDate: formatLocalDateToIsoString(task.parent.startDate),
          dueDate: formatLocalDateToIsoString(task.parent.dueDate),
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
