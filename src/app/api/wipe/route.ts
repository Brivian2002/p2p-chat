import { executeWipe } from "@/lib/push";
import { streamProgress } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/wipe
 * Body: { token, owner, repo, branch?, commitMessage? }
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

  return streamProgress((emit) =>
    executeWipe(
      {
        token,
        owner,
        repo,
        branch: body?.branch?.trim() || undefined,
        commitMessage: (body?.commitMessage as string)?.trim() || undefined,
      },
      (e) =>
        emit({
          stage: e.stage,
          label: e.label,
          detail: e.detail,
          progress: e.progress,
        }),
    ).then((r) => ({
      commitSha: r.commitSha,
      commitUrl: r.commitUrl,
      repoUrl: `https://github.com/${owner}/${repo}`,
      repoFullName: `${owner}/${repo}`,
      branch: body?.branch?.trim() || "main",
      added: 0,
      changed: 0,
      unchanged: 0,
      total: 0,
      mode: "replace" as const,
      commitMessage: body?.commitMessage || "Delete all files (via DropToGit)",
    })),
  );
}
