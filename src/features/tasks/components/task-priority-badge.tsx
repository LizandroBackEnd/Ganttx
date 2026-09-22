import { Badge } from "@/shared/components/ui/badge";
import { TASK_PRIORITY_LABELS, type TaskPriority } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface TaskPriorityBadgeProps {
  readonly priority: string;
  readonly className?: string;
}

const priorityStyles: Record<string, string> = {
  LOW: "bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-300 border-emerald-500/30",
  MEDIUM: "bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-300 border-sky-500/30",
  HIGH: "bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-orange-300 border-orange-500/30",
  URGENT: "bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-300 border-rose-500/40 font-bold shadow-[0_0_10px_rgba(244,63,94,0.15)]",
};

export function TaskPriorityBadge({
  priority,
  className,
}: TaskPriorityBadgeProps): React.JSX.Element {
  const label = TASK_PRIORITY_LABELS[priority as TaskPriority] ?? priority;
  const style = priorityStyles[priority] ?? "bg-surface-elevated text-text-secondary border-border";

  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] uppercase font-mono tracking-wider", style, className)}
    >
      {label}
    </Badge>
  );
}
