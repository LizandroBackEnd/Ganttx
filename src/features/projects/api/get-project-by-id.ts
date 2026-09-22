import "server-only";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ProjectDetailDTO } from "../types/project.types";

export async function getProjectById(
  projectId: string
): Promise<ProjectDetailDTO | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

  const memberRecord = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    select: {
      role: true,
    },
  });

  if (!memberRecord) {
    return null;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      members: {
        select: {
          role: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    currentUserRole: memberRecord.role,
    members: project.members.map((m) => ({
      userId: m.user.id,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
    })),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
