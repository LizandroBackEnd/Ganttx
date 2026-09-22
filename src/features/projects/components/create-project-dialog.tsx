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
import { createProject } from "../api/project-mutations";

export interface CreateProjectDialogProps {
  readonly trigger?: React.ReactNode;
}

export function CreateProjectDialog({
  trigger,
}: CreateProjectDialogProps): React.JSX.Element {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required (at least 3 characters)");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setIsOpen(false);
      setName("");
      setDescription("");
      router.push(`/projects/${result.data.id}`);
      router.refresh();
    } catch {
      setError("An unexpected error occurred while creating project");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="default" size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover">
            + New Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-border bg-surface sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-text-primary">
              Create New Project
            </DialogTitle>
            <DialogDescription className="text-sm text-text-secondary">
              Set up a collaborative workspace for your team and timeline.
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="project-name" className="text-xs font-medium text-text-secondary">
                Project Name *
              </label>
              <Input
                id="project-name"
                type="text"
                placeholder="e.g. Website Redesign Q3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
                minLength={3}
                maxLength={100}
                className="border-border bg-background text-text-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="project-desc" className="text-xs font-medium text-text-secondary">
                Description (optional)
              </label>
              <textarea
                id="project-desc"
                rows={3}
                placeholder="Briefly describe the scope or goal..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                maxLength={500}
                className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
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
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
