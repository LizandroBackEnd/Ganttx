import { Skeleton } from "@/shared/components/ui/skeleton";

export default function ProjectLoading(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-36 bg-surface-elevated" />
          <Skeleton className="h-4 w-64 bg-surface-elevated" />
        </div>
        <Skeleton className="h-8 w-24 bg-surface-elevated rounded-lg" />
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 bg-surface-elevated rounded-lg" />
            <Skeleton className="h-7 w-20 bg-surface-elevated rounded-lg" />
            <Skeleton className="h-7 w-20 bg-surface-elevated rounded-lg" />
          </div>
          <Skeleton className="h-7 w-48 bg-surface-elevated rounded-lg" />
        </div>

        <div className="flex flex-col gap-3 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="size-5 rounded bg-surface-elevated" />
                <Skeleton className="h-4 w-1/3 bg-surface-elevated" />
                <Skeleton className="h-4 w-16 bg-surface-elevated rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-20 bg-surface-elevated" />
                <Skeleton className="size-6 rounded-full bg-surface-elevated" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
