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
  createTaskCommentSchema,
  type TaskActionResult,
  type TaskDTO,
  type CreateTaskInput,
  type UpdateTaskInput,
  type UpdateTaskDatesInput,
  type UpdateTaskStatusInput,
  type DeleteTaskInput,
  type CreateTaskCommentInput,
  type TaskCommentDTO,
  type CustomStatusOption,
  type CustomPriorityOption,
  type SubtaskDTO,
} from "../types/task.types";

function parseDateStringToUtcDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}

export async function createTask(
  input: CreateTaskInput
): Promise<TaskActionResult<TaskDTO>> {
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
    title,
    description,
    priority,
    status,
    startDate,
    dueDate,
    predecessors,
    isEpic,
    isMilestone,
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
        title,
        description: description ?? null,
        priority,
        status,
        startDate: parseDateStringToUtcDate(startDate),
        dueDate: parseDateStringToUtcDate(dueDate),
        predecessors: predecessors ?? null,
        isEpic: Boolean(isEpic),
        isMilestone: Boolean(isMilestone),
        parentId: parentId ?? null,
        projectId,
        creatorId,
        assigneeId: assigneeId ?? null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        startDate: true,
        dueDate: true,
        predecessors: true,
        isEpic: true,
        isMilestone: true,
        parentId: true,
        projectId: true,
        assigneeId: true,
        creatorId: true,
        createdAt: true,
        updatedAt: true,
        parent: {
          select: {
            id: true,
            title: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    const formatLocalDateToIso = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const taskDto: TaskDTO = {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      startDate: formatLocalDateToIso(task.startDate),
      dueDate: formatLocalDateToIso(task.dueDate),
      predecessors: task.predecessors,
      isEpic: task.isEpic,
      isMilestone: task.isMilestone,
      parentId: task.parentId,
      parent: task.parent,
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      creatorId: task.creatorId,
      assignee: task.assignee,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };

    projectEvents.emit(projectId, "task:created", { taskId: task.id, title }, creatorId);
    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: taskDto };
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
        ...(fields.title !== undefined ? { title: fields.title } : {}),
        ...(fields.description !== undefined ? { description: fields.description } : {}),
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
        ...(fields.isMilestone !== undefined ? { isMilestone: fields.isMilestone } : {}),
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

export async function getSubtasks(
  taskId: string
): Promise<TaskActionResult<SubtaskDTO[]>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado" };
  }

  try {
    const subtasks = await prisma.task.findMany({
      where: { parentId: taskId },
      select: {
        id: true,
        title: true,
        status: true,
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
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true,
      data: subtasks.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        assigneeId: s.assigneeId,
        assignee: s.assignee,
      })),
    };
  } catch {
    return { success: false, error: "Error al cargar subtareas" };
  }
}

export async function createSubtask(input: {
  parentId: string;
  projectId: string;
  title: string;
  assigneeId?: string | null;
}): Promise<TaskActionResult<SubtaskDTO>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado" };
  }

  const title = input.title.trim();
  if (!title) {
    return { success: false, error: "El título es requerido" };
  }

  try {
    const parent = await prisma.task.findUnique({
      where: { id: input.parentId },
      select: { startDate: true, dueDate: true },
    });

    const now = new Date();
    const startDate = parent?.startDate ?? now;
    const dueDate = parent?.dueDate ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const subtask = await prisma.task.create({
      data: {
        projectId: input.projectId,
        creatorId: session.user.id,
        parentId: input.parentId,
        title,
        status: "TODO",
        priority: "MEDIUM",
        startDate,
        dueDate,
        assigneeId: input.assigneeId || null,
      },
      select: {
        id: true,
        title: true,
        status: true,
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
    });

    revalidatePath(`/projects/${input.projectId}`);

    return {
      success: true,
      data: {
        id: subtask.id,
        title: subtask.title,
        status: subtask.status,
        assigneeId: subtask.assigneeId,
        assignee: subtask.assignee,
      },
    };
  } catch {
    return { success: false, error: "Error al crear la subtarea" };
  }
}

export async function deleteSubtask(
  subtaskId: string,
  projectId: string
): Promise<TaskActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado" };
  }

  try {
    await prisma.task.delete({
      where: { id: subtaskId },
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Error al eliminar la subtarea" };
  }
}

export async function getTaskComments(
  taskId: string
): Promise<TaskActionResult<TaskCommentDTO[]>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado" };
  }

  try {
    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        taskId: true,
        authorId: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return {
      success: true,
      data: comments.map((c) => ({
        id: c.id,
        content: c.content,
        taskId: c.taskId,
        authorId: c.authorId,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        author: {
          id: c.author.id,
          name: c.author.name,
          email: c.author.email,
          image: c.author.image,
        },
      })),
    };
  } catch {
    return { success: false, error: "Error al cargar los comentarios" };
  }
}

export async function createTaskComment(
  input: CreateTaskCommentInput
): Promise<TaskActionResult<TaskCommentDTO>> {
  const parsed = createTaskCommentSchema.safeParse(input);
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

  const { taskId, projectId, content } = parsed.data;

  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId: session.user.id,
        projectId,
      },
    },
    select: { role: true },
  });

  if (!member) {
    return { success: false, error: "No tienes permiso para comentar en esta tarea" };
  }

  try {
    const comment = await prisma.taskComment.create({
      data: {
        content,
        taskId,
        authorId: session.user.id,
      },
      select: {
        id: true,
        content: true,
        taskId: true,
        authorId: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    projectEvents.emit(projectId, "task:updated", { taskId }, session.user.id);

    return {
      success: true,
      data: {
        id: comment.id,
        content: comment.content,
        taskId: comment.taskId,
        authorId: comment.authorId,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        author: {
          id: comment.author.id,
          name: comment.author.name,
          email: comment.author.email,
          image: comment.author.image,
        },
      },
    };
  } catch (err) {
    console.error("Error creating task comment:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al publicar el comentario",
    };
  }
}


