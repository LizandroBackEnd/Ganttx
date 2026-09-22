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
  type CustomStatusOption,
  type CustomPriorityOption,
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
      error: "Error de validación",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado" };
  }

  const creatorId = session.user.id;
  const {
    projectId,
    customId,
    title,
    description,
    requirement,
    sprint,
    durationDays,
    priority,
    status,
    startDate,
    dueDate,
    predecessors,
    isEpic,
    parentId,
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
    return { success: false, error: "Permiso denegado: debes ser miembro del proyecto" };
  }

  try {
    const task = await prisma.task.create({
      data: {
        customId: customId ?? null,
        title,
        description: description ?? null,
        requirement: requirement ?? null,
        sprint: sprint ?? null,
        durationDays: durationDays ?? null,
        priority,
        status,
        startDate: parseDateStringToUtcDate(startDate),
        dueDate: parseDateStringToUtcDate(dueDate),
        predecessors: predecessors ?? null,
        isEpic: Boolean(isEpic),
        parentId: parentId ?? null,
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
    return { success: false, error: "Error al crear la tarea" };
  }
}

export async function updateTask(
  input: UpdateTaskInput
): Promise<TaskActionResult<void>> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Error de validación",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado" };
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
    return { success: false, error: "Permiso denegado: debes ser miembro del proyecto" };
  }

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(fields.customId !== undefined ? { customId: fields.customId } : {}),
        ...(fields.title !== undefined ? { title: fields.title } : {}),
        ...(fields.description !== undefined ? { description: fields.description } : {}),
        ...(fields.requirement !== undefined ? { requirement: fields.requirement } : {}),
        ...(fields.sprint !== undefined ? { sprint: fields.sprint } : {}),
        ...(fields.durationDays !== undefined ? { durationDays: fields.durationDays } : {}),
        ...(fields.priority !== undefined ? { priority: fields.priority } : {}),
        ...(fields.status !== undefined ? { status: fields.status } : {}),
        ...(fields.startDate !== undefined
          ? { startDate: parseDateStringToUtcDate(fields.startDate) }
          : {}),
        ...(fields.dueDate !== undefined
          ? { dueDate: parseDateStringToUtcDate(fields.dueDate) }
          : {}),
        ...(fields.predecessors !== undefined ? { predecessors: fields.predecessors } : {}),
        ...(fields.isEpic !== undefined ? { isEpic: fields.isEpic } : {}),
        ...(fields.parentId !== undefined ? { parentId: fields.parentId } : {}),
        ...(fields.assigneeId !== undefined ? { assigneeId: fields.assigneeId } : {}),
      },
    });

    projectEvents.emit(task.projectId, "task:updated", { taskId, changes: fields }, userId);
    revalidatePath(`/projects/${task.projectId}`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Error al actualizar la tarea" };
  }
}

export async function updateTaskDates(
  input: UpdateTaskDatesInput
): Promise<TaskActionResult<void>> {
  const parsed = updateTaskDatesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Error de validación",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado" };
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
    return { success: false, error: "Permiso denegado" };
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
    return { success: false, error: "Error al actualizar las fechas de la tarea" };
  }
}

export async function updateTaskStatus(
  input: UpdateTaskStatusInput
): Promise<TaskActionResult<void>> {
  const parsed = updateTaskStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Error de validación",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado" };
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
    return { success: false, error: "Permiso denegado" };
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
    return { success: false, error: "Error al actualizar el estado de la tarea" };
  }
}

export async function deleteTask(
  input: DeleteTaskInput
): Promise<TaskActionResult<void>> {
  const parsed = deleteTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Error de validación",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado" };
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
    return { success: false, error: "Tarea no encontrada" };
  }

  const userRole = task.project.members[0]?.role;
  const isPrivileged = userRole === "OWNER" || userRole === "ADMIN";
  const isAuthorOrAssignee = task.creatorId === userId || task.assigneeId === userId;

  if (!isPrivileged && !isAuthorOrAssignee) {
    return {
      success: false,
      error: "Permiso denegado: solo puedes eliminar tus propias tareas a menos que seas administrador",
    };
  }

  try {
    await prisma.task.delete({
      where: { id: taskId },
    });

    projectEvents.emit(task.projectId, "task:deleted", { taskId }, userId);
    revalidatePath(`/projects/${task.projectId}`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Error al eliminar la tarea" };
  }
}

export async function updateProjectCustomOptions(
  projectId: string,
  options: {
    customStatuses?: readonly CustomStatusOption[];
    customPriorities?: readonly CustomPriorityOption[];
  }
): Promise<TaskActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado" };
  }

  const userId = session.user.id;

  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
    select: { role: true },
  });

  if (!member) {
    return { success: false, error: "Permiso denegado: debes ser miembro del proyecto" };
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(options.customStatuses !== undefined
          ? { customStatuses: options.customStatuses as object }
          : {}),
        ...(options.customPriorities !== undefined
          ? { customPriorities: options.customPriorities as object }
          : {}),
      },
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Error al guardar la configuración de estados y prioridades" };
  }
}
