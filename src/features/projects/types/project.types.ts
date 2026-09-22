import { z } from "zod";
import type { ProjectRole } from "@/lib/constants";

export interface ProjectDTO {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly role: ProjectRole;
  readonly memberCount: number;
  readonly taskCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectMemberDTO {
  readonly userId: string;
  readonly role: ProjectRole;
  readonly joinedAt: string;
  readonly name: string | null;
  readonly email: string;
  readonly image: string | null;
}

export interface ProjectCustomOption {
  readonly id: string;
  readonly label: string;
  readonly color?: string;
}

export interface ProjectDetailDTO {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly currentUserRole: ProjectRole;
  readonly members: readonly ProjectMemberDTO[];
  readonly customStatuses?: readonly ProjectCustomOption[] | null;
  readonly customPriorities?: readonly ProjectCustomOption[] | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ActionSuccess<T = void> = {
  readonly success: true;
  readonly data: T;
};

export type ActionFailure = {
  readonly success: false;
  readonly error: string;
  readonly fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure;

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name cannot exceed 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name cannot exceed 100 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const inviteMemberSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const removeMemberSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  userId: z.string().uuid("Invalid user ID"),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

export const deleteProjectSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

export type DeleteProjectInput = z.infer<typeof deleteProjectSchema>;
