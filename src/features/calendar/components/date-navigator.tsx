"use client";

import { Button } from "@/shared/components/ui/button";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export interface DateNavigatorProps {
  readonly title: string;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onToday: () => void;
}

export function DateNavigator({
  title,
  onPrevious,
  onNext,
  onToday,
}: DateNavigatorProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
        <button
          type="button"
          onClick={onPrevious}
          aria-label="Previous date range"
          className="flex size-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
        >
          <IconChevronLeft className="size-4" />
        </button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToday}
          className="h-7 px-2.5 text-xs text-text-primary hover:bg-surface-elevated font-medium"
        >
          Today
        </Button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next date range"
          className="flex size-7 items-center justify-center rounded-md text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
        >
          <IconChevronRight className="size-4" />
        </button>
      </div>

      <h3 className="text-base font-semibold text-text-primary tracking-tight">
        {title}
      </h3>
    </div>
  );
}
