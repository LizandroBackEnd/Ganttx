import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectEvents, type ProjectEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { projectId } = await params;
  const userId = session.user.id;

  // Verify project membership
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
    select: { role: true },
  });

  if (!member) {
    return new Response("Forbidden: Not a member of this project", { status: 403 });
  }

  const encoder = new TextEncoder();

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connect signal
      const initMessage = `event: connected\ndata: ${JSON.stringify({
        connectedAt: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initMessage));

      // Event listener
      const onProjectEvent = (event: ProjectEvent): void => {
        try {
          const chunk = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // controller might already be closed
        }
      };

      projectEvents.subscribe(projectId, onProjectEvent);

      // Keepalive heartbeat every 15s
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          // ignore
        }
      }, 15000);

      cleanup = (): void => {
        clearInterval(heartbeatTimer);
        projectEvents.unsubscribe(projectId, onProjectEvent);
      };
    },
    cancel() {
      cleanup?.();
    },
  });

  request.signal.addEventListener("abort", () => {
    cleanup?.();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
