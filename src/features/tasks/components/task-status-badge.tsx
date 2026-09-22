import { Badge } from "@/shared/components/ui/badge";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface TaskStatusBadgeProps {
  readonly status: TaskStatus;
  readonly className?: string;
}

const statusStyles: Record<TaskStatus, string> = {
  TODO: "bg-surface-elevated text-text-secondary border-border",
  IN_PROGRESS: "bg-primary/10 text-primary border-primary/20",
  IN_REVIEW: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  DONE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/20 line-through",
};

export function TaskStatusBadge({
  status,
  className,
}: TaskStatusBadgeProps): React.JSX.Element {
  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] font-medium tracking-tight", statusStyles[status], className)}
    >
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}
