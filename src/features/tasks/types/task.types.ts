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

export type CustomLabelOption = CustomPriorityOption;

export interface TaskParentDTO {
  readonly id: string;
  readonly title: string;
  readonly startDate?: string | null;
  readonly dueDate?: string | null;
}

export interface TaskPredecessorCandidateDTO {
  readonly id: string;
  readonly title: string;
  readonly bucket: string;
  readonly label: string;
  readonly isEpic: boolean;
  readonly startDate: string | null;
  readonly dueDate: string | null;
  readonly parentId: string | null;
}

export interface TaskDTO {
  readonly id: string;
  readonly title: string; // Nombre de la tarea
  readonly description: string | null;
  readonly label: string;
  readonly bucket: string;
  readonly startDate: string | null;
  readonly dueDate: string | null;
  readonly predecessors: string | null;
  readonly isEpic: boolean;
  readonly parentId: string | null;
  readonly parent?: TaskParentDTO | null;
  readonly subtasksCount?: number;
  readonly showSubtasksOnCard?: boolean;
  readonly subtasks?: readonly SubtaskDTO[];
  readonly projectId: string;
  readonly assigneeId: string | null;
  readonly creatorId: string;
  readonly assignee: TaskAssigneeDTO | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SubtaskDTO {
  readonly id: string;
  readonly title: string;
  readonly bucket: string;
  readonly label?: string;
  readonly showSubtasksOnCard?: boolean;
  readonly assigneeId: string | null;
  readonly assignee: TaskAssigneeDTO | null;
  readonly startDate?: string | null;
  readonly dueDate?: string | null;
}

export interface TaskCommentAuthorDTO {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
  readonly image: string | null;
}

export interface TaskCommentDTO {
  readonly id: string;
  readonly content: string;
  readonly taskId: string;
  readonly authorId: string;
  readonly author: TaskCommentAuthorDTO;
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

export const optionalDateSchema = z
  .string()
  .trim()
  .nullable()
  .refine((val) => val === null || val === "" || dateRegex.test(val), {
    message: "Formato de fecha inválido (debe ser YYYY-MM-DD)",
  })
  .transform((val) => {
    if (val === null || val === "") return null;
    return val;
  })
  .optional();

export const createTaskSchema = z
  .object({
    projectId: z.string().uuid("ID de proyecto inválido"),
    title: z.string().trim().min(1, "El nombre de la tarea es obligatorio").max(255),
    description: z.string().trim().max(2000).optional().nullable(),
    label: z.string().trim().max(50).default("MEDIUM"),
    bucket: z.string().trim().min(1, "El bucket es obligatorio").max(50),
    startDate: optionalDateSchema,
    dueDate: optionalDateSchema,
    predecessors: z.string().trim().max(500).optional().nullable(),
    isEpic: z.boolean().default(false),
    showSubtasksOnCard: z.boolean().default(false),
    parentId: z.string().uuid("ID de tarea padre inválido").optional().nullable(),
    assigneeId: z.string().uuid("ID de asignado inválido").optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.dueDate) {
        return data.dueDate >= data.startDate;
      }
      return true;
    },
    {
      message: "La fecha de fin no puede ser anterior a la fecha de inicio",
      path: ["dueDate"],
    }
  )
  .refine((data) => !(Boolean(data.parentId) && data.isEpic), {
    message: "Una subtarea no puede ser marcada como EPIC",
    path: ["isEpic"],
  });

export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    taskId: z.string().uuid("ID de tarea inválido"),
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    label: z.string().trim().max(50).optional(),
    bucket: z.string().trim().max(50).optional(),
    startDate: optionalDateSchema,
    dueDate: optionalDateSchema,
    predecessors: z.string().trim().max(500).optional().nullable(),
    isEpic: z.boolean().optional(),
    showSubtasksOnCard: z.boolean().optional(),
    parentId: z.string().uuid().optional().nullable(),
    assigneeId: z.string().uuid().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.dueDate) {
        return data.dueDate >= data.startDate;
      }
      return true;
    },
    {
      message: "La fecha de fin no puede ser anterior a la fecha de inicio",
      path: ["dueDate"],
    }
  )
  .refine((data) => !(Boolean(data.parentId) && data.isEpic), {
    message: "Una subtarea no puede ser marcada como EPIC",
    path: ["isEpic"],
  });

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const updateTaskDatesSchema = z
  .object({
    taskId: z.string().uuid("ID de tarea inválido"),
    startDate: optionalDateSchema,
    dueDate: optionalDateSchema,
  })
  .refine(
    (data) => {
      if (data.startDate && data.dueDate) {
        return data.dueDate >= data.startDate;
      }
      return true;
    },
    {
      message: "La fecha de fin no puede ser anterior a la fecha de inicio",
      path: ["dueDate"],
    }
  );

export type UpdateTaskDatesInput = z.infer<typeof updateTaskDatesSchema>;

export const updateTaskBucketSchema = z.object({
  taskId: z.string().uuid("ID de tarea inválido"),
  bucket: z.string().min(1).max(50),
});

export type UpdateTaskBucketInput = z.infer<typeof updateTaskBucketSchema>;
export const updateTaskStatusSchema = updateTaskBucketSchema;
export type UpdateTaskStatusInput = UpdateTaskBucketInput;

export const deleteTaskSchema = z.object({
  taskId: z.string().uuid("ID de tarea inválido"),
});

export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;

export const createTaskCommentSchema = z.object({
  taskId: z.string().uuid("ID de tarea inválido"),
  projectId: z.string().uuid("ID de proyecto inválido"),
  content: z.string().trim().min(1, "El comentario no puede estar vacío").max(5000, "El comentario no puede exceder 5000 caracteres"),
});

export type CreateTaskCommentInput = z.infer<typeof createTaskCommentSchema>;

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
  return [];
}

export function isTaskDone(bucket: string): boolean {
  return bucket === "DONE" || bucket.startsWith("DONE__");
}

export function getTaskBucketId(bucket: string): string {
  if (bucket.startsWith("DONE__")) {
    return bucket.slice(6);
  }
  return bucket;
}

export function toDoneBucket(currentBucket: string): string {
  if (isTaskDone(currentBucket)) {
    return currentBucket;
  }
  return `DONE__${currentBucket}`;
}

export function toUndoneBucket(currentBucket: string, fallback = "TODO"): string {
  if (currentBucket.startsWith("DONE__")) {
    return currentBucket.slice(6);
  }
  if (currentBucket === "DONE") {
    return fallback;
  }
  return currentBucket;
}
