import "server-only";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ProjectDTO } from "../types/project.types";

export async function getProjects(): Promise<ProjectDTO[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const userId = session.user.id;

  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: {
      role: true,
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              members: true,
              tasks: true,
            },
          },
        },
      },
    },
    orderBy: {
      project: {
        createdAt: "desc",
      },
    },
  });

  return memberships.map((membership) => ({
    id: membership.project.id,
    name: membership.project.name,
    description: membership.project.description,
    role: membership.role,
    memberCount: membership.project._count.members,
    taskCount: membership.project._count.tasks,
    createdAt: membership.project.createdAt.toISOString(),
    updatedAt: membership.project.updatedAt.toISOString(),
  }));
}
