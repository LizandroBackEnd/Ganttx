import type { GanttDayColumn } from "../types/gantt.types";

export interface GanttHeaderProps {
  readonly columns: readonly GanttDayColumn[];
  readonly columnWidthPx: number;
}

export function GanttHeader({
  columns,
  columnWidthPx,
}: GanttHeaderProps): React.JSX.Element {
  // Group columns by Month for top header row
  const monthGroups: { monthName: string; count: number }[] = [];
  let currentMonth = "";
  let count = 0;

  for (const col of columns) {
    if (col.monthName !== currentMonth) {
      if (currentMonth) {
        monthGroups.push({ monthName: currentMonth, count });
      }
      currentMonth = col.monthName;
      count = 1;
    } else {
      count++;
    }
  }
  if (count > 0) {
    monthGroups.push({ monthName: currentMonth, count });
  }

  return (
    <div className="h-full flex flex-col bg-surface select-none">
      {/* Month row */}
      <div className="h-7 flex items-center border-b border-border/60 bg-surface-elevated/50 text-[11px] font-semibold text-text-secondary">
        {monthGroups.map((group, idx) => (
          <div
            key={`${group.monthName}-${idx}`}
            style={{ width: `${group.count * columnWidthPx}px` }}
            className="border-r border-border/40 px-2 truncate leading-none"
          >
            {group.monthName}
          </div>
        ))}
      </div>

      {/* Days row */}
      <div className="h-9 flex text-[10px] font-mono text-text-muted">
        {columns.map((col) => (
          <div
            key={col.dateString}
            style={{ width: `${columnWidthPx}px` }}
            className={`flex flex-col items-center justify-center border-r border-border/30 ${
              col.isToday
                ? "bg-primary/10 text-primary font-bold"
                : col.isWeekend
                ? "bg-background/40"
                : ""
            }`}
          >
            <span className="leading-tight">{col.dayNumber}</span>
            <span className="text-[9px] uppercase text-text-muted/70 leading-tight">{col.dayName[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
