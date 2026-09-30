import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadBufferToStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Archivo no encontrado" },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "El archivo supera el tamaño máximo permitido de 50 MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await uploadBufferToStorage(
      buffer,
      file.name,
      file.type,
      "task-attachments"
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("Error en endpoint de subida:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Error al subir archivo",
      },
      { status: 500 }
    );
  }
}
