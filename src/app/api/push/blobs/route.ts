import { NextResponse } from "next/server";
import { createBlob, GitHubError } from "@/lib/github";
import { sanitizePath } from "@/lib/zip";
import type { BlobRef } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface BlobRequestFile {
  path: string;
  content: string; // base64
}

/**
 * POST /api/push/blobs
 * Body: { token, owner, repo, files: [{ path, content(base64) }] }
 * Response: { blobs: [{ path, sha, size }] }
 *
 * The client calls this repeatedly in batches to create Git blobs for the
 * uploaded files. Blob SHAs are accumulated client-side and sent to the final
 * /api/push/commit call.
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = (body?.token as string)?.trim();
  if (!token) {
    return NextResponse.json({ error: "A GitHub token is required." }, { status: 400 });
  }
  const owner = (body?.owner as string)?.trim();
  const repo = (body?.repo as string)?.trim();
  if (!owner || !repo) {
    return NextResponse.json({ error: "Owner and repo are required." }, { status: 400 });
  }
  const files: BlobRequestFile[] = Array.isArray(body?.files) ? body.files : [];
  if (files.length === 0) {
    return NextResponse.json({ blobs: [] });
  }
  if (files.length > 500) {
    return NextResponse.json(
      { error: "Too many files in one batch (max 500)." },
      { status: 400 },
    );
  }

  try {
    const blobs: BlobRef[] = [];
    for (const f of files) {
      // Defense-in-depth: re-sanitize paths server-side.
      const safePath = sanitizePath(String(f.path));
      if (!safePath) continue;
      const created = await createBlob(
        token,
        owner,
        repo,
        String(f.content),
        "base64",
      );
      const size = Math.floor((String(f.content).length * 3) / 4);
      blobs.push({ path: safePath, sha: created.sha, size });
    }
    return NextResponse.json({ blobs });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.safeDetail ?? "Failed to create Git blobs." },
      { status: e.status ?? 500 },
    );
  }
}
