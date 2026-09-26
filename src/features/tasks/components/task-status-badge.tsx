import { Badge } from "@/shared/components/ui/badge";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface TaskStatusBadgeProps {
  readonly status?: string;
  readonly bucket?: string;
  readonly className?: string;
}

export type TaskBucketBadgeProps = TaskStatusBadgeProps;

const statusStyles: Record<string, string> = {
  TODO: "bg-surface-elevated text-text-secondary border-border/80",
  IN_PROGRESS: "bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-300 border-sky-500/30",
  IN_REVIEW: "bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-300 border-amber-500/30",
  DONE: "bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-300 border-emerald-500/30",
  CANCELLED: "bg-gradient-to-r from-rose-500/15 to-red-500/15 text-rose-400 border-rose-500/30 line-through",
};

export function TaskStatusBadge({
  status,
  bucket,
  className,
}: TaskStatusBadgeProps): React.JSX.Element {
  const value = bucket ?? status ?? "TODO";
  const label = TASK_STATUS_LABELS[value as TaskStatus] ?? value;
  const style = statusStyles[value] ?? "bg-primary/10 text-primary border-primary/30";

  return (
    <Badge
      variant="outline"
      className={cn("text-[11px] font-medium tracking-tight", style, className)}
    >
      {label}
    </Badge>
  );
}

export const TaskBucketBadge = TaskStatusBadge;
