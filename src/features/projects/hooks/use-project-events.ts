"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export interface UseProjectEventsOptions {
  readonly projectId: string;
  readonly onEvent?: (eventType: string, data: unknown) => void;
}

export function useProjectEvents({
  projectId,
  onEvent,
}: UseProjectEventsOptions): void {
  const router = useRouter();
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let retryDelay = 1000;
    let isSubscribed = true;

    function connect(): void {
      if (!isSubscribed) return;

      eventSource = new EventSource(`/api/projects/${projectId}/events`);

      eventSource.onopen = (): void => {
        retryDelay = 1000;
      };

      const handleEvent = (type: string, e: MessageEvent): void => {
        try {
          const parsed = JSON.parse(e.data);
          onEventRef.current?.(type, parsed);
        } catch {
          // ignore parsing error
        }
        router.refresh();
      };

      eventSource.addEventListener("task:created", (e) => handleEvent("task:created", e as MessageEvent));
      eventSource.addEventListener("task:updated", (e) => handleEvent("task:updated", e as MessageEvent));
      eventSource.addEventListener("task:deleted", (e) => handleEvent("task:deleted", e as MessageEvent));
      eventSource.addEventListener("member:joined", (e) => handleEvent("member:joined", e as MessageEvent));
      eventSource.addEventListener("member:removed", (e) => handleEvent("member:removed", e as MessageEvent));

      eventSource.onerror = (): void => {
        eventSource?.close();
        if (!isSubscribed) return;

        // Exponential backoff reconnect (max 15s)
        retryTimeout = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 1.5, 15000);
          connect();
        }, retryDelay);
      };
    }

    connect();

    return () => {
      isSubscribed = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (eventSource) eventSource.close();
    };
  }, [projectId, router]);
}
