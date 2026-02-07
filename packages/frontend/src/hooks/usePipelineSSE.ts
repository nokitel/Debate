"use client";

import { useEffect, useRef, useState } from "react";
import type { SSEEvent } from "@dialectical/shared";

const BACKEND_URL = process.env["NEXT_PUBLIC_BACKEND_URL"] ?? "http://localhost:4000";

interface UsePipelineSSEOptions {
  debateId: string;
  argumentId: string;
  enabled: boolean;
}

interface UsePipelineSSEResult {
  events: SSEEvent[];
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook for subscribing to pipeline progress via SSE.
 */
export function usePipelineSSE(options: UsePipelineSSEOptions): UsePipelineSSEResult {
  const { debateId, argumentId, enabled } = options;
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const url = `${BACKEND_URL}/api/pipeline/${debateId}/${argumentId}/stream`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    const eventTypes = [
      "stage-start",
      "stage-complete",
      "stage-failed",
      "candidate-generated",
      "tournament-round",
      "pipeline-complete",
      "pipeline-error",
    ];

    for (const eventType of eventTypes) {
      eventSource.addEventListener(eventType, (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as SSEEvent;
          setEvents((prev) => [...prev, data]);

          // Auto-close on terminal events
          if (eventType === "pipeline-complete" || eventType === "pipeline-error") {
            eventSource.close();
            setIsConnected(false);
          }
        } catch {
          // Ignore malformed events
        }
      });
    }

    eventSource.onerror = () => {
      setError("Connection lost");
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [debateId, argumentId, enabled]);

  return { events, isConnected, error };
}
