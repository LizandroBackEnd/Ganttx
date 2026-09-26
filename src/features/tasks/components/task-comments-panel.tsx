"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { getTaskComments, createTaskComment } from "../api/task-mutations";
import type { TaskCommentDTO, TaskDTO } from "../types/task.types";
import {
  IconMessageDots,
  IconLoader2,
} from "@tabler/icons-react";
import { sileo } from "sileo";
import { cn } from "@/lib/utils";

export interface ProjectMemberLite {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
  readonly image?: string | null;
}

export interface TaskCommentsPanelProps {
  readonly taskId?: string | null;
  readonly projectId: string;
  readonly task?: TaskDTO | null;
  readonly members?: readonly ProjectMemberLite[];
  readonly className?: string;
}

function formatActivityDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    const day = d.getDate();
    const months = [
      "ene", "feb", "mar", "abr", "may", "jun",
      "jul", "ago", "sep", "oct", "nov", "dic",
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return "";
  }
}

function getInitials(name?: string | null, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

export function TaskCommentsPanel({
  taskId,
  projectId,
  task,
  members = [],
  className,
}: TaskCommentsPanelProps): React.JSX.Element {
  const [comments, setComments] = useState<TaskCommentDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(taskId));
  const [newComment, setNewComment] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    if (!taskId) return;

    let isMounted = true;

    void getTaskComments(taskId).then((res) => {
      if (!isMounted) return;
      setIsLoading(false);
      if (res.success) {
        setComments(res.data);
        setTimeout(() => scrollToBottom(false), 50);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [taskId, scrollToBottom]);

  const handleSend = async (): Promise<void> => {
    const content = newComment.trim();
    if (!content || !taskId || isSending) return;

    setIsSending(true);
    try {
      const res = await createTaskComment({
        taskId,
        projectId,
        content,
      });

      if (res.success) {
        setComments((prev) => [...prev, res.data]);
        setNewComment("");
        setIsFocused(false);
        setTimeout(() => scrollToBottom(true), 50);
      } else {
        sileo.error({
          title: "Error al enviar",
          description: res.error,
        });
      }
    } catch {
      sileo.error({
        title: "Error",
        description: "No se pudo enviar el comentario.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const creatorMember =
    members.find((m) => m.id === task?.creatorId) ??
    (task?.assignee
      ? {
          id: task.assignee.id,
          name: task.assignee.name,
          email: task.assignee.email,
          image: task.assignee.image,
        }
      : null);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header estilo "Comentarios y Actividad" */}
      <div className="flex items-center justify-between pb-3.5">
        <div className="flex items-center gap-2">
          <IconMessageDots className="size-4 text-text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Comentarios y Actividad
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="text-xs px-2.5 py-1 rounded-md border border-border/70 text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors font-medium cursor-pointer"
        >
          {showDetails ? "Ocultar detalles" : "Mostrar detalles"}
        </button>
      </div>

      {/* Input de comentario en la parte superior */}
      <div className="mb-4">
        <div
          className={cn(
            "relative rounded-xl border border-border/80 bg-surface-elevated/40 transition-all",
            isFocused && "border-primary/60 ring-1 ring-primary/20 bg-surface-elevated/60"
          )}
        >
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            disabled={!taskId || isSending}
            placeholder={
              !taskId
                ? "Nombra la tarea para comentar..."
                : "Escribe un comentario..."
            }
            rows={isFocused || newComment ? 3 : 1}
            className="w-full resize-none bg-transparent px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted/70 focus:outline-none disabled:opacity-50 leading-relaxed"
          />

          {(isFocused || newComment.trim()) && (
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-border/40">
              <span className="text-[10px] text-text-muted">
                Presiona Enter para enviar
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFocused(false);
                    setNewComment("");
                  }}
                  className="text-xs px-2.5 py-1 rounded-md text-text-muted hover:text-text-primary cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!taskId || isSending || !newComment.trim()}
                  className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  {isSending && <IconLoader2 className="size-3 animate-spin" />}
                  <span>Guardar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feed de Actividad y Comentarios */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-95 max-h-[calc(85vh-220px)]">
        {/* Actividad inicial: Creación de la tarea (como en la foto) */}
        {task && showDetails && (
          <div className="flex items-start gap-3 text-xs leading-relaxed">
            <Avatar size="sm" className="mt-0.5 shrink-0 border border-border/60">
              {creatorMember?.image && (
                <AvatarImage
                  src={creatorMember.image}
                  alt={creatorMember.name ?? "Usuario"}
                />
              )}
              <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                {getInitials(creatorMember?.name, creatorMember?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-text-secondary text-xs">
                <strong className="text-text-primary font-semibold">
                  {creatorMember?.name || creatorMember?.email || "Usuario"}
                </strong>{" "}
                ha añadido esta tarea al proyecto
              </p>
              <span className="inline-block mt-0.5 text-[11px] text-sky-400 hover:underline cursor-pointer">
                {formatActivityDate(task.createdAt)}
              </span>
            </div>
          </div>
        )}


        {/* Cargando comentarios */}
        {isLoading && (
          <div className="flex items-center gap-2 text-text-muted text-xs py-2">
            <IconLoader2 className="size-4 animate-spin text-primary" />
            <span>Cargando comentarios...</span>
          </div>
        )}

        {/* Lista de Comentarios de los usuarios */}
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="flex items-start gap-3 text-xs leading-relaxed group"
          >
            <Avatar size="sm" className="mt-0.5 shrink-0 border border-border/60">
              {comment.author.image && (
                <AvatarImage
                  src={comment.author.image}
                  alt={comment.author.name ?? "Usuario"}
                />
              )}
              <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                {getInitials(comment.author.name, comment.author.email)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <strong className="text-text-primary font-semibold text-xs block">
                {comment.author.name || comment.author.email.split("@")[0]}
              </strong>

              <div className="mt-1 p-2.5 rounded-xl bg-surface-elevated/40 border border-border/60 text-text-primary text-xs wrap-break-word whitespace-pre-wrap leading-relaxed">
                {comment.content}
              </div>

              <span className="inline-block mt-1 text-[11px] text-sky-400 hover:underline cursor-pointer">
                {formatActivityDate(comment.createdAt)}
              </span>
            </div>
          </div>
        ))}

        {!taskId && (
          <div className="text-center py-6 text-text-muted">
            <p className="text-xs">
              Escribe el título de la tarea para habilitar comentarios y actividad.
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
