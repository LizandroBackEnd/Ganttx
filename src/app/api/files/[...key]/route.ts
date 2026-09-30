import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedDownloadUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    key: string[];
  }>;
}

export async function GET(
  request: Request,
  context: RouteContext
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  const { key } = await context.params;
  if (!key || key.length === 0) {
    return NextResponse.json(
      { success: false, error: "Ruta de archivo no especificada" },
      { status: 400 }
    );
  }

  const fileKey = key.map((segment) => decodeURIComponent(segment)).join("/");

  try {
    // Genera enlace firmado temporal con vigencia de 15 minutos (900 seg)
    const downloadUrl = await getPresignedDownloadUrl(fileKey, 900);

    const url = new URL(request.url);
    if (url.searchParams.get("json") === "true") {
      return NextResponse.json({ success: true, url: downloadUrl });
    }

    // Redirige directamente al archivo seguro en Oracle Cloud (307 Temporary Redirect)
    return NextResponse.redirect(downloadUrl, 307);
  } catch (error: unknown) {
    console.error("Error al generar URL prefirmada de Oracle Storage:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo obtener el archivo" },
      { status: 500 }
    );
  }
}
