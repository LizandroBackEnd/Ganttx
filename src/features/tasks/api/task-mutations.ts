"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { projectEvents } from "@/lib/events";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskDatesSchema,
  updateTaskStatusSchema,
  deleteTaskSchema,
  type TaskActionResult,
  type CreateTaskInput,
  type UpdateTaskInput,
  type UpdateTaskDatesInput,
  type UpdateTaskStatusInput,
  type DeleteTaskInput,
} from "../types/task.types";

function parseDateStringToUtcDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}

export async function createTask(
  input: CreateTaskInput
): Promise<TaskActionResult<{ id: string }>> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const creatorId = session.user.id;
  const {
    projectId,
    title,
    description,
    priority,
    status,
    progress,
    startDate,
    dueDate,
    assigneeId,
  } = parsed.data;

  // Verify project membership
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId: creatorId, projectId },
    },
    select: { role: true },
  });

  if (!member) {
    return { success: false, error: "Permission denied: must be a project member" };
  }

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        priority,
        status,
        progress,
        startDate: parseDateStringToUtcDate(startDate),
        dueDate: parseDateStringToUtcDate(dueDate),
        projectId,
        creatorId,
        assigneeId: assigneeId ?? null,
      },
      select: { id: true },
    });

    projectEvents.emit(projectId, "task:created", { taskId: task.id, title }, creatorId);
    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: { id: task.id } };
  } catch {
    return { success: false, error: "Failed to create task" };
  }
}

export async function updateTask(
  input: UpdateTaskInput
): Promise<TaskActionResult<void>> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;
  const { taskId, ...fields } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      projectId: true,
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
    return { success: false, error: "Permission denied: must be a project member" };
  }

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(fields.title !== undefined ? { title: fields.title } : {}),
        ...(fields.description !== undefined ? { description: fields.description } : {}),
        ...(fields.priority !== undefined ? { priority: fields.priority } : {}),
        ...(fields.status !== undefined ? { status: fields.status } : {}),
        ...(fields.progress !== undefined ? { progress: fields.progress } : {}),
        ...(fields.startDate !== undefined
          ? { startDate: parseDateStringToUtcDate(fields.startDate) }
          : {}),
        ...(fields.dueDate !== undefined
          ? { dueDate: parseDateStringToUtcDate(fields.dueDate) }
          : {}),
        ...(fields.assigneeId !== undefined ? { assigneeId: fields.assigneeId } : {}),
      },
    });

    projectEvents.emit(task.projectId, "task:updated", { taskId, changes: fields }, userId);
    revalidatePath(`/projects/${task.projectId}`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update task" };
  }
}

export async function updateTaskDates(
  input: UpdateTaskDatesInput
): Promise<TaskActionResult<void>> {
  const parsed = updateTaskDatesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;
  const { taskId, startDate, dueDate } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      projectId: true,
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
    return { success: false, error: "Permission denied" };
  }

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        startDate: parseDateStringToUtcDate(startDate),
        dueDate: parseDateStringToUtcDate(dueDate),
      },
    });

    projectEvents.emit(task.projectId, "task:updated", { taskId, startDate, dueDate }, userId);
    revalidatePath(`/projects/${task.projectId}`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update task dates" };
  }
}

export async function updateTaskStatus(
  input: UpdateTaskStatusInput
): Promise<TaskActionResult<void>> {
  const parsed = updateTaskStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;
  const { taskId, status } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      projectId: true,
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
    return { success: false, error: "Permission denied" };
  }

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { status },
    });

    projectEvents.emit(task.projectId, "task:updated", { taskId, status }, userId);
    revalidatePath(`/projects/${task.projectId}`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update task status" };
  }
}

export async function deleteTask(
  input: DeleteTaskInput
): Promise<TaskActionResult<void>> {
  const parsed = deleteTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = session.user.id;
  const { taskId } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      projectId: true,
      creatorId: true,
      assigneeId: true,
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
    return { success: false, error: "Task not found" };
  }

  const userRole = task.project.members[0]?.role;
  const isPrivileged = userRole === "OWNER" || userRole === "ADMIN";
  const isAuthorOrAssignee = task.creatorId === userId || task.assigneeId === userId;

  if (!isPrivileged && !isAuthorOrAssignee) {
    return { success: false, error: "Permission denied: can only delete your own tasks unless admin" };
  }

  try {
    await prisma.task.delete({
      where: { id: taskId },
    });

    projectEvents.emit(task.projectId, "task:deleted", { taskId }, userId);
    revalidatePath(`/projects/${task.projectId}`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete task" };
  }
}
