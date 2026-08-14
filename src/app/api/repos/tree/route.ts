import { NextResponse } from "next/server";
import { getExistingFiles, getDefaultBranch, GitHubError } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/repos/tree
 * Body: { token, owner, repo, branch? }
 * Response: { files: [{ path, sha }], truncated, branch }
 *
 * Used by the client to compute a pre-push diff (new / changed / unchanged)
 * WITHOUT uploading anything.
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = (body?.token as string)?.trim();
  const owner = (body?.owner as string)?.trim();
  const repo = (body?.repo as string)?.trim();
  if (!token || !owner || !repo) {
    return NextResponse.json(
      { error: "token, owner and repo are required." },
      { status: 400 },
    );
  }

  try {
    const branch =
      (body?.branch as string)?.trim() || (await getDefaultBranch(token, owner, repo));
    const { files, truncated } = await getExistingFiles(token, owner, repo, branch);
    return NextResponse.json({ files, truncated, branch });
  } catch (e: any) {
    if (e instanceof GitHubError && (e.status === 404 || e.status === 409)) {
      // Empty repo — treat as zero existing files.
      return NextResponse.json({ files: [], truncated: false, branch: null });
    }
    return NextResponse.json(
      { error: e.safeDetail ?? "Failed to read repository tree." },
      { status: e.status ?? 500 },
    );
  }
}
