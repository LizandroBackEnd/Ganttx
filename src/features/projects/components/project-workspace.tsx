"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCalendar, ViewSwitcher, DateNavigator, CalendarGrid } from "@/features/calendar";
import { TaskTable, TaskFormDialog, type ProjectMemberOption } from "@/features/tasks";
import { GanttChart } from "@/features/gantt";
import { useProjectEvents } from "../hooks/use-project-events";
import {
  ProjectSidebar,
  type WorkspacePrimaryView,
  type CalendarSubMode,
} from "./project-sidebar";
import { Button } from "@/shared/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const viewParam = searchParams.get("view");
  const primaryView: WorkspacePrimaryView =
    viewParam === "calendar" || viewParam === "gantt" ? viewParam : "tasks";

  const calViewParam = searchParams.get("calView");
  const calendarSubMode: CalendarSubMode =
    calViewParam === "week" || calViewParam === "day" || calViewParam === "year"
      ? calViewParam
      : "month";

  const {
    currentDate,
    viewMode,
    setViewMode,
    goToToday,
    goToPrevious,
    goToNext,
    formattedTitle,
  } = useCalendar(calendarSubMode);

  useEffect(() => {
    setViewMode(calendarSubMode);
  }, [calendarSubMode, setViewMode]);

  const handleSelectPrimaryView = (newView: WorkspacePrimaryView): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    if (newView === "calendar") {
      params.set("calView", calendarSubMode);
    } else {
      params.delete("calView");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSelectCalendarSubMode = (newSubMode: CalendarSubMode): void => {
    setViewMode(newSubMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "calendar");
    params.set("calView", newSubMode);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Connect to SSE stream for real-time collaboration
  useProjectEvents({ projectId: project.id });

  // Compute available epics for hierarchy picker
  const availableEpics = tasks
    .filter((t) => t.isEpic)
    .map((t) => ({ id: t.id, title: t.title, customId: t.customId }));

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-[calc(100vh-7.5rem)] items-stretch">
      {/* Left Sidebar */}
      <ProjectSidebar
        projectId={project.id}
        primaryView={primaryView}
        calendarSubMode={calendarSubMode}
        onSelectPrimaryView={handleSelectPrimaryView}
        onSelectCalendarSubMode={handleSelectCalendarSubMode}
        taskCount={tasks.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 w-full min-w-0 p-6 flex flex-col gap-5 overflow-x-hidden">
        {/* Calendar Navigation Toolbar */}
        {primaryView === "calendar" && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <ViewSwitcher
                currentView={viewMode}
                onViewChange={handleSelectCalendarSubMode}
              />
              <DateNavigator
                title={formattedTitle}
                onPrevious={goToPrevious}
                onNext={goToNext}
                onToday={goToToday}
              />
            </div>
          </div>
        )}

        {/* Gantt Toolbar with Nueva Tarea */}
        {primaryView === "gantt" && (
          <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary tracking-tight">
                Cronograma Gantt
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Arrastra las barras para reprogramar fechas interactivamente.
              </p>
            </div>

            <TaskFormDialog
              projectId={project.id}
              members={members}
              availableEpics={availableEpics}
              customStatuses={project.customStatuses}
              customPriorities={project.customPriorities}
              trigger={
                <Button
                  size="sm"
                  variant="default"
                  className="bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs"
                >
                  <IconPlus className="size-3.5 mr-1" />
                  Nueva Tarea
                </Button>
              }
            />
          </div>
        )}

        {/* Active View Component */}
        <div className="w-full">
          {primaryView === "tasks" ? (
            <TaskTable
              projectId={project.id}
              tasks={tasks}
              members={members}
              availableEpics={availableEpics}
              customStatuses={project.customStatuses}
              customPriorities={project.customPriorities}
              canEdit={true}
            />
          ) : primaryView === "gantt" ? (
            <GanttChart
              projectId={project.id}
              tasks={tasks}
              members={members}
              availableEpics={availableEpics}
              customStatuses={project.customStatuses}
              customPriorities={project.customPriorities}
            />
          ) : (
            <CalendarGrid
              currentDate={currentDate}
              viewMode={viewMode}
              tasks={tasks}
              projectId={project.id}
              members={members}
              availableEpics={availableEpics}
              customStatuses={project.customStatuses}
              customPriorities={project.customPriorities}
            />
          )}
        </div>
      </div>
    </div>
  );
}
