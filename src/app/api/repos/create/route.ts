import { NextResponse } from "next/server";
import { createRepo, GitHubError } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/repos/create — create a new repository for the user. */
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

  const name = (body?.name as string)?.trim();
  if (!name || !/^[a-zA-Z0-9._-]+$/.test(name) || name.length > 100) {
    return NextResponse.json(
      { error: "Repository name may only contain letters, numbers, ., _ and -." },
      { status: 400 },
    );
  }

  try {
    const repo = await createRepo(token, {
      name,
      private: Boolean(body?.private ?? true),
      description: (body?.description as string)?.trim() || undefined,
    });
    return NextResponse.json({ repo });
  } catch (e: any) {
    if (e instanceof GitHubError && e.status === 422) {
      return NextResponse.json(
        { error: "A repository with that name already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: e.safeDetail ?? "Failed to create repository." },
      { status: e.status ?? 500 },
    );
  }
}
