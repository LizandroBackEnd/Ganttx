"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { projectEvents } from "@/lib/events";
import { sendProjectInvitationEmail } from "../lib/send-project-invitation";
import {
  createProjectSchema,
  updateProjectSchema,
  deleteProjectSchema,
  inviteMemberSchema,
  removeMemberSchema,
  type ActionResult,
  type CreateProjectInput,
  type UpdateProjectInput,
  type DeleteProjectInput,
  type InviteMemberInput,
  type RemoveMemberInput,
} from "../types/project.types";

export async function createProject(
  input: CreateProjectInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createProjectSchema.safeParse(input);
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

  try {
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          customStatuses: [],
        },
        select: { id: true },
      });

      await tx.projectMember.create({
        data: {
          userId,
          projectId: newProject.id,
          role: "OWNER",
        },
      });

      return newProject;
    });

    revalidatePath("/");
    return { success: true, data: { id: project.id } };
  } catch {
    return { success: false, error: "Error al crear el proyecto" };
  }
}

export async function updateProject(
  input: UpdateProjectInput
): Promise<ActionResult<void>> {
  const parsed = updateProjectSchema.safeParse(input);
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
  const { projectId, name, description } = parsed.data;

  // Check role: must be OWNER or ADMIN
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
    select: { role: true },
  });

  if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
    return { success: false, error: "Permiso denegado: se requiere rol de administrador" };
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    revalidatePath("/");
    revalidatePath(`/projects/${projectId}`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Error al actualizar el proyecto" };
  }
}

export async function deleteProject(
  input: DeleteProjectInput
): Promise<ActionResult<void>> {
  const parsed = deleteProjectSchema.safeParse(input);
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
  const { projectId } = parsed.data;

  // Only OWNER can delete a project
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
    select: { role: true },
  });

  if (!member || member.role !== "OWNER") {
    return { success: false, error: "Permiso denegado: solo el propietario puede eliminar el proyecto" };
  }

  try {
    await prisma.project.delete({
      where: { id: projectId },
    });

    revalidatePath("/");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Error al eliminar el proyecto" };
  }
}

export async function inviteMember(
  input: InviteMemberInput
): Promise<ActionResult<{ emailSent: boolean }>> {
  const parsed = inviteMemberSchema.safeParse(input);
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

  const callerId = session.user.id;
  const { projectId, email, role } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  // Caller must be OWNER or ADMIN
  const callerMembership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId: callerId, projectId },
    },
    select: { role: true },
  });

  if (!callerMembership || (callerMembership.role !== "OWNER" && callerMembership.role !== "ADMIN")) {
    return { success: false, error: "Permiso denegado: se requiere rol de administrador para invitar miembros" };
  }

  // Fetch project details for the invitation email
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });

  if (!project) {
    return { success: false, error: "Proyecto no encontrado" };
  }

  // Find or create target user by email so they can be invited before first login
  let targetUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true },
  });

  if (!targetUser) {
    targetUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
      },
      select: { id: true, email: true },
    });
  }

  // Check if target user is already a member
  const existingMembership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId: targetUser.id, projectId },
    },
    select: { role: true },
  });

  if (existingMembership) {
    return { success: false, error: "El usuario ya es miembro de este proyecto" };
  }

  try {
    await prisma.projectMember.create({
      data: {
        userId: targetUser.id,
        projectId,
        role,
      },
    });

    // Send branded invitation email via Gmail REST API
    const inviterName = session.user.name || session.user.email || "Un miembro del equipo";
    const emailResult = await sendProjectInvitationEmail({
      toEmail: normalizedEmail,
      projectName: project.name,
      projectId,
      inviterName,
      role,
    });

    if (!emailResult.success) {
      console.warn("[inviteMember] Email dispatch warning:", emailResult.error);
    }

    projectEvents.emit(projectId, "member:joined", { userId: targetUser.id, role }, callerId);
    revalidatePath(`/projects/${projectId}/settings`);

    return {
      success: true,
      data: { emailSent: emailResult.success },
    };
  } catch (err) {
    console.error("[inviteMember] Failed to add project member:", err);
    return { success: false, error: "Error al invitar al miembro" };
  }
}

export async function removeMember(
  input: RemoveMemberInput
): Promise<ActionResult<void>> {
  const parsed = removeMemberSchema.safeParse(input);
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

  const callerId = session.user.id;
  const { projectId, userId } = parsed.data;

  // Caller role
  const caller = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId: callerId, projectId },
    },
    select: { role: true },
  });

  if (!caller || (caller.role !== "OWNER" && caller.role !== "ADMIN")) {
    return { success: false, error: "Permiso denegado: se requiere rol de administrador" };
  }

  // Target member role
  const target = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
    select: { role: true },
  });

  if (!target) {
    return { success: false, error: "Miembro no encontrado en el proyecto" };
  }

  if (target.role === "OWNER") {
    return { success: false, error: "No se puede eliminar al propietario del proyecto" };
  }

  if (caller.role === "ADMIN" && target.role === "ADMIN") {
    return { success: false, error: "Los administradores no pueden eliminar a otros administradores" };
  }

  try {
    await prisma.projectMember.delete({
      where: {
        userId_projectId: { userId, projectId },
      },
    });

    projectEvents.emit(projectId, "member:removed", { userId }, callerId);
    revalidatePath(`/projects/${projectId}/settings`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Error al eliminar al miembro" };
  }
}
