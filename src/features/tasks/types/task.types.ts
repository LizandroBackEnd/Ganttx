import { z } from "zod";
import type { TaskPriority, TaskStatus } from "@/lib/constants";

export interface TaskAssigneeDTO {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
  readonly image: string | null;
}

export interface TaskDTO {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly progress: number;
  readonly startDate: string;
  readonly dueDate: string;
  readonly projectId: string;
  readonly assigneeId: string | null;
  readonly creatorId: string;
  readonly assignee: TaskAssigneeDTO | null;
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

export type TaskActionResult<T = void> = ActionSuccess<T> | ActionFailure;

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createTaskSchema = z
  .object({
    projectId: z.string().uuid("Invalid project ID"),
    title: z.string().trim().min(1, "Title is required").max(255, "Title cannot exceed 255 characters"),
    description: z.string().trim().max(2000, "Description cannot exceed 2000 characters").optional().nullable(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]).default("TODO"),
    progress: z.number().int().min(0).max(100).default(0),
    startDate: z.string().regex(dateRegex, "Invalid start date format (YYYY-MM-DD)"),
    dueDate: z.string().regex(dateRegex, "Invalid due date format (YYYY-MM-DD)"),
    assigneeId: z.string().uuid("Invalid assignee ID").optional().nullable(),
  })
  .refine((data) => data.dueDate >= data.startDate, {
    message: "Due date cannot be earlier than start date",
    path: ["dueDate"],
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
  title: z.string().trim().min(1, "Title is required").max(255).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.string().regex(dateRegex).optional(),
  dueDate: z.string().regex(dateRegex).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const updateTaskDatesSchema = z
  .object({
    taskId: z.string().uuid("Invalid task ID"),
    startDate: z.string().regex(dateRegex, "Invalid start date (YYYY-MM-DD)"),
    dueDate: z.string().regex(dateRegex, "Invalid due date (YYYY-MM-DD)"),
  })
  .refine((data) => data.dueDate >= data.startDate, {
    message: "Due date cannot be earlier than start date",
    path: ["dueDate"],
  });

export type UpdateTaskDatesInput = z.infer<typeof updateTaskDatesSchema>;

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export const deleteTaskSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
});

export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;
