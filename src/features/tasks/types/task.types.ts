import { z } from "zod";

export interface TaskAssigneeDTO {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
  readonly image: string | null;
}

export interface CustomStatusOption {
  readonly id: string;
  readonly label: string;
  readonly color?: string;
}

export interface CustomPriorityOption {
  readonly id: string;
  readonly label: string;
  readonly color?: string;
}

export interface TaskParentDTO {
  readonly id: string;
  readonly title: string;
  readonly customId: string | null;
}

export interface TaskDTO {
  readonly id: string;
  readonly customId: string | null;
  readonly title: string; // Actividad
  readonly description: string | null;
  readonly requirement: string | null;
  readonly sprint: string | null;
  readonly durationDays: number | null;
  readonly priority: string;
  readonly status: string;
  readonly startDate: string;
  readonly dueDate: string;
  readonly predecessors: string | null;
  readonly isEpic: boolean;
  readonly parentId: string | null;
  readonly parent?: TaskParentDTO | null;
  readonly subtasksCount?: number;
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
    projectId: z.string().uuid("ID de proyecto inválido"),
    customId: z.string().trim().max(50).optional().nullable(),
    title: z.string().trim().min(1, "La actividad es obligatoria").max(255),
    description: z.string().trim().max(2000).optional().nullable(),
    requirement: z.string().trim().max(50).optional().nullable(),
    sprint: z.string().trim().max(50).optional().nullable(),
    durationDays: z.number().int().min(0).optional().nullable(),
    priority: z.string().trim().min(1).max(50).default("MEDIUM"),
    status: z.string().trim().min(1).max(50).default("TODO"),
    startDate: z.string().regex(dateRegex, "Formato de fecha de inicio inválido"),
    dueDate: z.string().regex(dateRegex, "Formato de fecha de fin inválido"),
    predecessors: z.string().trim().max(500).optional().nullable(),
    isEpic: z.boolean().default(false),
    parentId: z.string().uuid("ID de tarea padre inválido").optional().nullable(),
    assigneeId: z.string().uuid("ID de asignado inválido").optional().nullable(),
  })
  .refine((data) => data.dueDate >= data.startDate, {
    message: "La fecha de fin no puede ser anterior a la fecha de inicio",
    path: ["dueDate"],
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  taskId: z.string().uuid("ID de tarea inválido"),
  customId: z.string().trim().max(50).optional().nullable(),
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  requirement: z.string().trim().max(50).optional().nullable(),
  sprint: z.string().trim().max(50).optional().nullable(),
  durationDays: z.number().int().min(0).optional().nullable(),
  priority: z.string().trim().max(50).optional(),
  status: z.string().trim().max(50).optional(),
  startDate: z.string().regex(dateRegex).optional(),
  dueDate: z.string().regex(dateRegex).optional(),
  predecessors: z.string().trim().max(500).optional().nullable(),
  isEpic: z.boolean().optional(),
  parentId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const updateTaskDatesSchema = z
  .object({
    taskId: z.string().uuid("ID de tarea inválido"),
    startDate: z.string().regex(dateRegex, "Fecha de inicio inválida"),
    dueDate: z.string().regex(dateRegex, "Fecha de fin inválida"),
  })
  .refine((data) => data.dueDate >= data.startDate, {
    message: "La fecha de fin no puede ser anterior a la fecha de inicio",
    path: ["dueDate"],
  });

export type UpdateTaskDatesInput = z.infer<typeof updateTaskDatesSchema>;

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid("ID de tarea inválido"),
  status: z.string().min(1).max(50),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export const deleteTaskSchema = z.object({
  taskId: z.string().uuid("ID de tarea inválido"),
});

export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;

export interface BucketOption {
  readonly id: string;
  readonly label: string;
  readonly color?: string;
}

export const DEFAULT_BUCKETS: readonly BucketOption[] = [
  { id: "BACKLOG", label: "Backlog", color: "#64748b" },
  { id: "TODO", label: "Por Hacer", color: "#0ea5e9" },
  { id: "IN_PROGRESS", label: "En Progreso", color: "#f59e0b" },
  { id: "IN_REVIEW", label: "En Revisión", color: "#a855f7" },
  { id: "DONE", label: "Completadas", color: "#10b981" },
];

export function getBucketColor(id: string): string {
  const upper = id.toUpperCase();
  if (upper.includes("BACKLOG")) return "#64748b";
  if (upper.includes("TODO") || upper.includes("HACER") || upper.includes("SPRINT")) return "#0ea5e9";
  if (upper.includes("PROGRESS") || upper.includes("PROGRESO")) return "#f59e0b";
  if (upper.includes("REVIEW") || upper.includes("REVISION") || upper.includes("TEST")) return "#a855f7";
  if (upper.includes("DONE") || upper.includes("COMPLET") || upper.includes("FINAL")) return "#10b981";
  return "#00f28e";
}

export function getProjectBuckets(
  customStatuses?: readonly CustomStatusOption[] | null
): BucketOption[] {
  if (customStatuses && customStatuses.length > 0) {
    return customStatuses.map((s) => ({
      id: s.id,
      label: s.label,
      color: s.color ?? getBucketColor(s.id),
    }));
  }
  return [...DEFAULT_BUCKETS];
}
