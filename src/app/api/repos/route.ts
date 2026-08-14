import { NextResponse } from "next/server";
import { createRepo, listRepos, verifyToken, GitHubError } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Minimal body validation — never log the token. */
function getToken(body: unknown): string {
  const t = (body as any)?.token;
  if (typeof t !== "string" || !t.trim()) {
    throw new GitHubError(400, "A GitHub token is required.");
  }
  return t.trim();
}

/** POST /api/repos — list the authenticated user's repositories. */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let token: string;
  try {
    token = getToken(body);
  } catch (e: any) {
    return NextResponse.json({ error: e.safeDetail }, { status: e.status });
  }

  try {
    const [user, repos] = await Promise.all([
      verifyToken(token),
      listRepos(token),
    ]);
    return NextResponse.json({ login: user.login, repos });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.safeDetail ?? "Failed to load repositories." },
      { status: e.status ?? 500 },
    );
  }
}
