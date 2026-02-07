import type { Response } from "express";
import type { SSEEvent } from "@dialectical/shared";
import { SSEEventSchema } from "@dialectical/shared";

const HEARTBEAT_INTERVAL_MS = 15_000;

interface ActiveStream {
  res: Response;
  heartbeatTimer: ReturnType<typeof setInterval>;
}

/**
 * Manages active SSE connections for pipeline progress.
 * Supports multiple clients watching the same pipeline run.
 */
class PipelineStreamManager {
  private streams = new Map<string, ActiveStream[]>();

  /** Build a unique key for a pipeline run. */
  private key(debateId: string, argumentId: string): string {
    return `${debateId}:${argumentId}`;
  }

  /**
   * Create a new SSE stream for a pipeline run.
   * Sets up headers, heartbeat, and cleanup.
   */
  createStream(debateId: string, argumentId: string, res: Response): void {
    const streamKey = this.key(debateId, argumentId);

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // Send initial connection event
    res.write(": connected\n\n");

    // Heartbeat to keep connection alive
    const heartbeatTimer = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, HEARTBEAT_INTERVAL_MS);

    const stream: ActiveStream = { res, heartbeatTimer };

    const existing = this.streams.get(streamKey);
    if (existing) {
      existing.push(stream);
    } else {
      this.streams.set(streamKey, [stream]);
    }

    // Cleanup on client disconnect
    res.on("close", () => {
      this.removeStream(streamKey, stream);
    });
  }

  /**
   * Emit an SSE event to all clients watching a pipeline run.
   * Validates the event against the schema before sending.
   */
  emit(debateId: string, argumentId: string, event: SSEEvent): void {
    const streamKey = this.key(debateId, argumentId);
    const streams = this.streams.get(streamKey);
    if (!streams || streams.length === 0) return;

    // Validate event against schema
    const parsed = SSEEventSchema.safeParse(event);
    if (!parsed.success) {
      console.error("Invalid SSE event:", parsed.error.message);
      return;
    }

    const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

    for (const stream of streams) {
      try {
        stream.res.write(data);
      } catch {
        // Client disconnected — will be cleaned up by close handler
      }
    }
  }

  /**
   * Close all streams for a pipeline run.
   * Called when the pipeline completes or fails.
   */
  closeAll(debateId: string, argumentId: string): void {
    const streamKey = this.key(debateId, argumentId);
    const streams = this.streams.get(streamKey);
    if (!streams) return;

    for (const stream of streams) {
      clearInterval(stream.heartbeatTimer);
      try {
        stream.res.end();
      } catch {
        // Already closed
      }
    }

    this.streams.delete(streamKey);
  }

  /**
   * Check if there are active listeners for a pipeline run.
   */
  hasListeners(debateId: string, argumentId: string): boolean {
    const streamKey = this.key(debateId, argumentId);
    const streams = this.streams.get(streamKey);
    return !!streams && streams.length > 0;
  }

  private removeStream(streamKey: string, stream: ActiveStream): void {
    clearInterval(stream.heartbeatTimer);

    const streams = this.streams.get(streamKey);
    if (!streams) return;

    const index = streams.indexOf(stream);
    if (index !== -1) {
      streams.splice(index, 1);
    }

    if (streams.length === 0) {
      this.streams.delete(streamKey);
    }
  }
}

/** Singleton stream manager instance. */
export const pipelineStreamManager = new PipelineStreamManager();

/**
 * Create an emit function bound to a specific pipeline run.
 * This is passed to the AI pipeline for event emission.
 */
export function createEmitter(debateId: string, argumentId: string): (event: SSEEvent) => void {
  return (event: SSEEvent) => {
    pipelineStreamManager.emit(debateId, argumentId, event);
  };
}
