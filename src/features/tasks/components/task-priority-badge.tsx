import { Badge } from "@/shared/components/ui/badge";
import { TASK_PRIORITY_LABELS, type TaskPriority } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface TaskPriorityBadgeProps {
  readonly priority: TaskPriority;
  readonly className?: string;
}

const priorityStyles: Record<TaskPriority, string> = {
  LOW: "bg-surface-elevated text-text-muted border-border",
  MEDIUM: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  HIGH: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  URGENT: "bg-rose-500/10 text-rose-400 border-rose-500/20 font-semibold",
};

export function TaskPriorityBadge({
  priority,
  className,
}: TaskPriorityBadgeProps): React.JSX.Element {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] uppercase font-mono tracking-wider", priorityStyles[priority], className)}
    >
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
