"use client";

import { useCalendar, ViewSwitcher, DateNavigator, CalendarGrid } from "@/features/calendar";
import { TaskTable, TaskFormDialog, type ProjectMemberOption } from "@/features/tasks";
import { GanttChart } from "@/features/gantt";
import { useProjectEvents } from "../hooks/use-project-events";
import { Button } from "@/shared/components/ui/button";
import type { TaskDTO } from "@/features/tasks";
import type { ProjectDetailDTO } from "../types/project.types";

export interface ProjectWorkspaceProps {
  readonly project: ProjectDetailDTO;
  readonly tasks: readonly TaskDTO[];
  readonly members: readonly ProjectMemberOption[];
}

export function ProjectWorkspace({
  project,
  tasks,
  members,
}: ProjectWorkspaceProps): React.JSX.Element {
  const {
    currentDate,
    viewMode,
    setViewMode,
    goToToday,
    goToPrevious,
    goToNext,
    formattedTitle,
  } = useCalendar("month");

  // Connect to SSE stream for real-time collaboration
  useProjectEvents({ projectId: project.id });

  return (
    <div className="flex flex-col gap-6">
      {/* Top Controls Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/50 pb-4">
        {/* Left: View Switcher */}
        <div className="flex items-center gap-3">
          <ViewSwitcher
            currentView={viewMode}
            onViewChange={setViewMode}
          />
        </div>

        {/* Center: Date Navigator (for calendar views) */}
        {(viewMode === "month" || viewMode === "week" || viewMode === "day" || viewMode === "year") && (
          <DateNavigator
            title={formattedTitle}
            onPrevious={goToPrevious}
            onNext={goToNext}
            onToday={goToToday}
          />
        )}

        {/* Right: Actions & Live Indicator */}
        <div className="flex items-center gap-3 self-end lg:self-auto">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Sync</span>
          </div>

          <TaskFormDialog
            projectId={project.id}
            members={members}
            trigger={
              <Button size="sm" variant="default" className="bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm">
                + New Task
              </Button>
            }
          />
        </div>
      </div>

      {/* Main View Area */}
      <div className="w-full">
        {viewMode === "tasks" ? (
          <TaskTable
            projectId={project.id}
            tasks={tasks}
            members={members}
            canEdit={true}
          />
        ) : viewMode === "gantt" ? (
          <GanttChart
            projectId={project.id}
            tasks={tasks}
            members={members}
          />
        ) : (
          <CalendarGrid
            currentDate={currentDate}
            viewMode={viewMode}
            tasks={tasks}
            projectId={project.id}
            members={members}
          />
        )}
      </div>
    </div>
  );
}
