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
import { inviteMember } from "../api/project-mutations";
import { IconPlus } from "@tabler/icons-react";
import { sileo } from "sileo";

export interface InviteMemberDialogProps {
  readonly projectId: string;
  readonly trigger?: React.ReactNode;
}

export function InviteMemberDialog({
  projectId,
  trigger,
}: InviteMemberDialogProps): React.JSX.Element {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!email.trim()) {
      setError("El correo electrónico es obligatorio");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await inviteMember({
        projectId,
        email: email.trim(),
        role,
      });

      if (!result.success) {
        setError(result.error);
        sileo.error({
          title: "Error al invitar",
          description: result.error,
        });
        setIsLoading(false);
        return;
      }

      const invitedEmail = email.trim();
      setIsOpen(false);
      setEmail("");
      setRole("MEMBER");
      sileo.success({
        title: "Invitación enviada",
        description: `Se envió una invitación a "${invitedEmail}".`,
      });
      router.refresh();
    } catch {
      const msg = "Ocurrió un error inesperado al invitar al miembro";
      setError(msg);
      sileo.error({
        title: "Error al invitar",
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <IconPlus className="size-3.5 mr-1" />
            Invitar Miembro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-border bg-surface sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-text-primary">
              Invitar Miembro del Equipo
            </DialogTitle>
            <DialogDescription className="text-sm text-text-secondary">
              Invita a un usuario registrado mediante su correo electrónico para colaborar en este proyecto.
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="member-email" className="text-xs font-medium text-text-secondary">
                Correo Electrónico *
              </label>
              <Input
                id="member-email"
                type="email"
                placeholder="companero@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="border-border bg-background text-text-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="member-role" className="text-xs font-medium text-text-secondary">
                Rol en el Proyecto
              </label>
              <select
                id="member-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "MEMBER" | "ADMIN")}
                disabled={isLoading}
                className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="MEMBER">Miembro (puede crear y editar tareas)</option>
                <option value="ADMIN">Administrador (puede gestionar miembros y ajustes)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isLoading}
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              {isLoading ? "Invitando..." : "Enviar Invitación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
