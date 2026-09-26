"use server";

import { auth } from "@/lib/auth";
import { uploadBufferToBlob, type UploadedBlobResult } from "@/lib/azure-blob";

export interface UploadActionResult {
  readonly success: boolean;
  readonly error?: string;
  readonly data?: UploadedBlobResult;
}

export async function uploadTaskAttachmentAction(
  formData: FormData
): Promise<UploadActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "No autorizado" };
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { success: false, error: "Archivo no encontrado en la solicitud" };
  }

  // 50 MB limit
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: "El archivo supera el tamaño máximo permitido de 50 MB" };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await uploadBufferToBlob(
      buffer,
      file.name,
      file.type,
      "task-attachments"
    );

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    console.error("Error subiendo archivo a Blob Storage:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al subir el archivo",
    };
  }
}
