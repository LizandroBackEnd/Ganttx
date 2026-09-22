"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { updateProject, deleteProject } from "../api/project-mutations";
import type { ProjectRole } from "@/lib/constants";

export interface ProjectSettingsFormProps {
  readonly projectId: string;
  readonly initialName: string;
  readonly initialDescription: string | null;
  readonly currentUserRole: ProjectRole;
}

export function ProjectSettingsForm({
  projectId,
  initialName,
  initialDescription,
  currentUserRole,
}: ProjectSettingsFormProps): React.JSX.Element {
  const router = useRouter();
  const [name, setName] = useState<string>(initialName);
  const [description, setDescription] = useState<string>(initialDescription ?? "");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canEdit = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const canDelete = currentUserRole === "OWNER";

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: "error", text: "Project name is required" });
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);
      const res = await updateProject({
        projectId,
        name: name.trim(),
        description: description.trim() || null,
      });

      if (!res.success) {
        setMessage({ type: "error", text: res.error });
        return;
      }

      setMessage({ type: "success", text: "Project updated successfully" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Failed to update project" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!confirm("Are you sure? This will permanently delete the project and all its tasks.")) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await deleteProject({ projectId });
      if (!res.success) {
        alert(res.error);
        setIsDeleting(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      alert("Failed to delete project");
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* General Settings */}
      <form onSubmit={handleUpdate} className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-base font-semibold text-text-primary">General Settings</h3>
        <p className="text-xs text-text-secondary mt-1">
          Update the display name and description of this workspace.
        </p>

        {message && (
          <div
            className={`mt-4 rounded-lg p-3 text-xs ${
              message.type === "success"
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-4 max-w-lg">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-project-name" className="text-xs font-medium text-text-secondary">
              Project Name
            </label>
            <Input
              id="settings-project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit || isSaving}
              required
              minLength={3}
              maxLength={100}
              className="border-border bg-background text-text-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-project-desc" className="text-xs font-medium text-text-secondary">
              Description
            </label>
            <textarea
              id="settings-project-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit || isSaving}
              maxLength={500}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {canEdit && (
            <div className="mt-2">
              <Button
                type="submit"
                variant="default"
                disabled={isSaving}
                className="bg-primary text-primary-foreground hover:bg-primary-hover text-xs"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </form>

      {/* Danger Zone */}
      {canDelete && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <h3 className="text-base font-semibold text-destructive">Danger Zone</h3>
          <p className="text-xs text-text-secondary mt-1">
            Permanently delete this project and all associated tasks and timelines. This cannot be undone.
          </p>

          <div className="mt-5">
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
              className="text-xs"
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
