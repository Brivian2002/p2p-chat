import { executePush } from "@/lib/push";
import { streamProgress } from "@/lib/sse";
import { sanitizeDestination } from "@/lib/zip";
import type { BlobRef, PushMode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/push/commit
 * Body: { token, owner, repo, branch?, mode, destination, commitMessage, blobs: [{path, sha, size}] }
 * Response: text/event-stream of ProgressEvent.
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = (body?.token as string)?.trim();
  const owner = (body?.owner as string)?.trim();
  const repo = (body?.repo as string)?.trim();
  if (!token || !owner || !repo) {
    return new Response(
      JSON.stringify({ error: "token, owner and repo are required." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const mode: PushMode = body?.mode === "replace" ? "replace" : "smart";
  const destination = sanitizeDestination(body?.destination ?? "");
  const commitMessage = (body?.commitMessage as string)?.trim();
  const blobs: BlobRef[] = Array.isArray(body?.blobs) ? body.blobs : [];

  if (blobs.length === 0) {
    return new Response(
      JSON.stringify({ error: "No files to push." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  return streamProgress((emit) =>
    executePush(
      {
        token,
        owner,
        repo,
        branch: body?.branch?.trim() || undefined,
        mode,
        destination,
        commitMessage: commitMessage || "",
        blobs,
      },
      (e) =>
        emit({
          stage: e.stage,
          label: e.label,
          detail: e.detail,
          progress: e.progress,
        }),
    ),
  );
}
