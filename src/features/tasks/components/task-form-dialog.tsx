"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { createTask, updateTask } from "../api/task-mutations";
import type { TaskDTO } from "../types/task.types";
import type { TaskPriority, TaskStatus } from "@/lib/constants";

export interface ProjectMemberOption {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
}

export interface TaskFormDialogProps {
  readonly projectId: string;
  readonly members?: readonly ProjectMemberOption[];
  readonly taskToEdit?: TaskDTO;
  readonly trigger?: React.ReactNode;
  readonly isOpenControlled?: boolean;
  readonly onOpenChangeControlled?: (open: boolean) => void;
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0] ?? "2026-01-01";
}

function getOneWeekLaterString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0] ?? "2026-01-08";
}

export function TaskFormDialog({
  projectId,
  members = [],
  taskToEdit,
  trigger,
  isOpenControlled,
  onOpenChangeControlled,
}: TaskFormDialogProps): React.JSX.Element {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const isControlled = isOpenControlled !== undefined;
  const isOpen = isControlled ? isOpenControlled : internalOpen;
  const setOpen = isControlled ? onOpenChangeControlled! : setInternalOpen;

  const [title, setTitle] = useState<string>(taskToEdit?.title ?? "");
  const [description, setDescription] = useState<string>(taskToEdit?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(taskToEdit?.priority ?? "MEDIUM");
  const [status, setStatus] = useState<TaskStatus>(taskToEdit?.status ?? "TODO");
  const [progress, setProgress] = useState<number>(taskToEdit?.progress ?? 0);
  const [startDate, setStartDate] = useState<string>(taskToEdit?.startDate ?? getTodayString());
  const [dueDate, setDueDate] = useState<string>(taskToEdit?.dueDate ?? getOneWeekLaterString());
  const [assigneeId, setAssigneeId] = useState<string>(taskToEdit?.assigneeId ?? "");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }
    if (dueDate < startDate) {
      setError("Due date cannot be earlier than start date");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (taskToEdit) {
        const res = await updateTask({
          taskId: taskToEdit.id,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status,
          progress,
          startDate,
          dueDate,
          assigneeId: assigneeId || null,
        });

        if (!res.success) {
          setError(res.error);
          setIsLoading(false);
          return;
        }
      } else {
        const res = await createTask({
          projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status,
          progress,
          startDate,
          dueDate,
          assigneeId: assigneeId || undefined,
        });

        if (!res.success) {
          setError(res.error);
          setIsLoading(false);
          return;
        }
      }

      setOpen(false);
      if (!taskToEdit) {
        setTitle("");
        setDescription("");
        setProgress(0);
      }
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="border-border bg-surface sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-text-primary">
              {taskToEdit ? "Edit Task" : "Create New Task"}
            </DialogTitle>
            <DialogDescription className="text-sm text-text-secondary">
              {taskToEdit ? "Update task properties and schedule." : "Add a new task to your project timeline."}
            </DialogDescription>
          </DialogHeader>

          <div className="my-5 flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-title" className="text-xs font-medium text-text-secondary">
                Title *
              </label>
              <Input
                id="task-title"
                type="text"
                placeholder="e.g. Design wireframes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
                required
                maxLength={255}
                className="border-border bg-background text-text-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-status" className="text-xs font-medium text-text-secondary">
                  Status
                </label>
                <select
                  id="task-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  disabled={isLoading}
                  className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-priority" className="text-xs font-medium text-text-secondary">
                  Priority
                </label>
                <select
                  id="task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  disabled={isLoading}
                  className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-start" className="text-xs font-medium text-text-secondary">
                  Start Date *
                </label>
                <Input
                  id="task-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isLoading}
                  required
                  className="border-border bg-background text-text-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-due" className="text-xs font-medium text-text-secondary">
                  Due Date *
                </label>
                <Input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isLoading}
                  required
                  className="border-border bg-background text-text-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="task-assignee" className="text-xs font-medium text-text-secondary">
                  Assignee
                </label>
                <select
                  id="task-assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={isLoading}
                  className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name ? `${m.name} (${m.email})` : m.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="task-progress" className="text-xs font-medium text-text-secondary">
                    Progress
                  </label>
                  <span className="text-xs font-mono text-primary">{progress}%</span>
                </div>
                <input
                  id="task-progress"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  disabled={isLoading}
                  className="accent-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-description" className="text-xs font-medium text-text-secondary">
                Description (optional)
              </label>
              <textarea
                id="task-description"
                rows={2}
                placeholder="Details, checklist, or acceptance criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                maxLength={2000}
                className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isLoading}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              {isLoading ? "Saving..." : taskToEdit ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
