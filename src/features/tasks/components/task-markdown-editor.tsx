"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";

import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconListCheck,
  IconList,
  IconListNumbers,
  IconH2,
  IconH3,
  IconQuote,
  IconCode,
  IconLink,
  IconPhoto,
  IconLoader2,
  IconUpload,
} from "@tabler/icons-react";
import { sileo } from "sileo";
import { cn } from "@/lib/utils";

export interface TaskMarkdownEditorProps {
  readonly value: string;
  readonly onChange: (nextValue: string) => void;
  readonly onBlur?: () => void;
  readonly placeholder?: string;
  readonly className?: string;
  readonly disabled?: boolean;
}

export function TaskMarkdownEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Escribe una descripción detallada...",
  className,
  disabled = false,
}: TaskMarkdownEditorProps): React.JSX.Element {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Markdown.configure({
        html: false, // Output pure markdown
        transformPastedText: true,
        transformCopiedText: true,
      }),
      Image.configure({
        inline: false,
        HTMLAttributes: {
          class: "max-h-80 rounded-xl border border-border shadow-md object-contain bg-surface-elevated/30 my-2",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary hover:underline font-medium cursor-pointer",
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex gap-2 items-start",
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-text-muted before:float-left before:pointer-events-none",
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const markdownStorage = editor.storage.markdown as { getMarkdown: () => string };
      onChange(markdownStorage.getMarkdown());
    },
    onBlur: () => {
      if (onBlur) onBlur();
    },
    editorProps: {
      attributes: {
        class:
          "w-full flex-1 min-h-[12rem] bg-transparent text-sm text-text-primary focus:outline-none resize-none leading-relaxed font-sans prose prose-sm dark:prose-invert max-w-none p-3",
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          event.preventDefault();
          setIsDragOver(false);
          void handleUploadFiles(event.dataTransfer.files);
          return true;
        }
        setIsDragOver(false);
        return false;
      },
      handlePaste: (view, event, _slice) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        
        const filesToUpload: File[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file) filesToUpload.push(file);
          }
        }

        if (filesToUpload.length > 0) {
          event.preventDefault();
          void handleUploadFiles(filesToUpload);
          return true;
        }
        return false;
      },
    },
  });

  // Update content if value changes externally
  useEffect(() => {
    if (editor) {
      const markdownStorage = editor.storage.markdown as { getMarkdown: () => string };
      if (value !== markdownStorage.getMarkdown()) {
        // Only update if the editor is not focused to avoid cursor jumping
        if (!editor.isFocused) {
          editor.commands.setContent(value);
        }
      }
    }
  }, [value, editor]);

  const handleUploadFiles = useCallback(
    async (files: FileList | File[]): Promise<void> => {
      if (!editor) return;
      const fileList = Array.from(files);
      if (fileList.length === 0) return;

      setIsUploading(true);

      for (const file of fileList) {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/tasks/attachments/upload", {
            method: "POST",
            body: formData,
          });

          const json = await res.json();

          if (res.ok && json.success && json.data?.url) {
            const isImg = file.type.startsWith("image/");
            
            if (isImg) {
              editor.chain().focus().setImage({ src: json.data.url, alt: file.name }).run();
            } else {
              const url = json.data.url;
              editor
                .chain()
                .focus()
                .insertContent(`<a href="${url}">📄 ${file.name}</a>`)
                .run();
            }

            sileo.success({
              title: isImg ? "Imagen adjuntada" : "Documento adjuntado",
              description: `"${file.name}" se subió al almacenamiento.`,
            });
          } else {
            sileo.error({
              title: "Error al subir archivo",
              description: json.error || "No se pudo subir el archivo a Blob Storage.",
            });
          }
        } catch {
          sileo.error({
            title: "Error de red",
            description: `No se pudo conectar con el storage para subir "${file.name}".`,
          });
        }
      }

      setIsUploading(false);
    },
    [editor]
  );

  if (!editor) {
    return <></>;
  }

  return (
    <div
      className={cn(
        "relative flex flex-col flex-1 min-h-60 rounded-xl border border-border bg-background transition-all overflow-hidden",
        isDragOver && "ring-2 ring-primary border-primary",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleUploadFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-surface-elevated/40 px-2 py-1.5 select-none">
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-30",
            editor.isActive("bold") && "bg-surface text-text-primary"
          )}
        >
          <IconBold className="size-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-30",
            editor.isActive("italic") && "bg-surface text-text-primary"
          )}
        >
          <IconItalic className="size-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            "p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-30",
            editor.isActive("strike") && "bg-surface text-text-primary"
          )}
        >
          <IconStrikethrough className="size-4" />
        </button>

        <div className="h-4 w-px bg-border/60 mx-1" />

        <button
          type="button"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(
            "p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-30",
            editor.isActive("heading", { level: 2 }) && "bg-surface text-text-primary"
          )}
        >
          <IconH2 className="size-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(
            "p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-30",
            editor.isActive("heading", { level: 3 }) && "bg-surface text-text-primary"
          )}
        >
          <IconH3 className="size-4" />
        </button>

        <div className="h-4 w-px bg-border/60 mx-1" />

        <button
          type="button"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={cn(
            "p-1 rounded-md text-primary/90 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-30",
            editor.isActive("taskList") && "bg-primary/10 text-primary"
          )}
        >
          <IconListCheck className="size-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-30",
            editor.isActive("bulletList") && "bg-surface text-text-primary"
          )}
        >
          <IconList className="size-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-30",
            editor.isActive("orderedList") && "bg-surface text-text-primary"
          )}
        >
          <IconListNumbers className="size-4" />
        </button>

        <div className="h-4 w-px bg-border/60 mx-1" />

        <button
          type="button"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            "p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-30",
            editor.isActive("blockquote") && "bg-surface text-text-primary"
          )}
        >
          <IconQuote className="size-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn(
            "p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-30",
            editor.isActive("codeBlock") && "bg-surface text-text-primary"
          )}
        >
          <IconCode className="size-4" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            const url = window.prompt("URL del enlace:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={cn(
            "p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer disabled:opacity-30",
            editor.isActive("link") && "bg-surface text-text-primary"
          )}
        >
          <IconLink className="size-4" />
        </button>

        <div className="flex-1" />

        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-primary hover:text-primary-foreground hover:bg-primary/90 bg-primary/10 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
        >
          {isUploading ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconPhoto className="size-4" />
          )}
          <span>Adjuntar</span>
        </button>
      </div>

      {/* Editor Content */}
      <div className="relative flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
        
        {isDragOver && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-xs border-2 border-dashed border-primary flex flex-col items-center justify-center gap-2 z-20 pointer-events-none">
            <div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg animate-bounce">
              <IconUpload className="size-5" />
            </div>
            <p className="text-sm font-semibold text-primary">
              Suelta aquí tus archivos para subirlos
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

