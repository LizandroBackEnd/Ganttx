"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { InviteMemberDialog } from "./invite-member-dialog";
import { removeMember } from "../api/project-mutations";
import { sileo } from "sileo";
import type { ProjectMemberDTO } from "../types/project.types";
import type { ProjectRole } from "@/lib/constants";

export interface ProjectMembersTableProps {
  readonly projectId: string;
  readonly members: readonly ProjectMemberDTO[];
  readonly currentUserRole: ProjectRole;
  readonly currentUserId?: string;
}

export function ProjectMembersTable({
  projectId,
  members,
  currentUserRole,
  currentUserId,
}: ProjectMembersTableProps): React.JSX.Element {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isPrivileged = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const handleRemove = async (userId: string, email: string): Promise<void> => {
    try {
      setRemovingId(userId);
      const res = await removeMember({ projectId, userId });
      if (!res.success) {
        sileo.error({
          title: "Error al eliminar miembro",
          description: res.error,
        });
        return;
      }
      sileo.success({
        title: "Miembro eliminado",
        description: `"${email}" fue eliminado del proyecto.`,
      });
      router.refresh();
    } catch {
      sileo.error({
        title: "Error al eliminar miembro",
        description: "Ocurrió un error inesperado al eliminar el miembro.",
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4 bg-surface-elevated/40">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Miembros del Equipo</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {members.length} {members.length === 1 ? "persona tiene" : "personas tienen"} acceso a este proyecto.
          </p>
        </div>

        {isPrivileged && <InviteMemberDialog projectId={projectId} />}
      </div>

      <div className="divide-y divide-border/40">
        {members.map((member) => {
          const initials = (member.name?.[0] ?? member.email[0] ?? "U").toUpperCase();
          const canRemove =
            isPrivileged &&
            member.role !== "OWNER" &&
            member.userId !== currentUserId &&
            (currentUserRole === "OWNER" || member.role === "MEMBER");

          return (
            <div
              key={member.userId}
              className="flex items-center justify-between gap-4 p-4 hover:bg-surface-elevated/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={member.name ?? "Avatar"}
                    width={32}
                    height={32}
                    unoptimized
                    className="size-8 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                    {initials}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {member.name ?? member.email}
                    </span>
                    {member.userId === currentUserId && (
                      <span className="text-[10px] text-text-muted">(tú)</span>
                    )}
                  </div>
                  <span className="text-xs text-text-secondary truncate block">
                    {member.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono uppercase tracking-wider text-text-secondary border-border"
                >
                  {member.role === "OWNER" ? "PROPIETARIO" : member.role === "ADMIN" ? "ADMIN" : "MIEMBRO"}
                </Badge>

                {canRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={removingId === member.userId}
                    onClick={() => handleRemove(member.userId, member.email)}
                    className="text-xs text-destructive hover:bg-destructive/10"
                  >
                    {removingId === member.userId ? "Eliminando..." : "Eliminar"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
