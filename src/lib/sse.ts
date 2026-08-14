import type { ProgressEvent } from "@/lib/types";

/**
 * Run an async job that reports ProgressEvents via a sink, and stream those
 * events to the client as Server-Sent Events. The final event carries either
 * `result` (success) or `error`.
 */
export function streamProgress(
  work: (emit: (e: ProgressEvent) => void) => Promise<ProgressEvent["result"]>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: ProgressEvent) => {
        const line = `data: ${JSON.stringify(e)}\n\n`;
        controller.enqueue(encoder.encode(line));
      };
      try {
        const result = await work(emit);
        emit({ stage: "complete", label: "Complete", result });
      } catch (err: any) {
        const safe =
          err?.safeDetail ||
          err?.message ||
          "Something went wrong during the operation.";
        emit({
          stage: "error",
          label: "Error",
          error: safe.replace(/Bearer [^"]+/g, "Bearer ***"), // never leak token
        });
      } finally {
        controller.close();
      }
    },
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

/** Parse an SSE Response stream into an async iterator of ProgressEvents. */
export async function* readProgressStream(
  res: Response,
): AsyncGenerator<ProgressEvent> {
  if (!res.body) throw new Error("No response body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const json = line.slice(5).trim();
      if (!json) continue;
      try {
        yield JSON.parse(json) as ProgressEvent;
      } catch {
        // ignore malformed lines
      }
    }
  }
}
