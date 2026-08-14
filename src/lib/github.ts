import "server-only";
import type {
  BlobRef,
  ExistingFile,
  RepoInfo,
  TreeEntry,
} from "@/lib/types";

/**
 * Server-side GitHub REST + Git Data API client.
 *
 * SECURITY:
 *  - The token is passed per-request and NEVER stored/logged.
 *  - Errors surfaced to clients never include the token.
 */

const API = "https://api.github.com";

export class GitHubError extends Error {
  status: number;
  /** Safe, token-free context for the user. */
  safeDetail: string;
  constructor(status: number, safeDetail: string, internal?: string) {
    super(internal ?? safeDetail);
    this.status = status;
    this.safeDetail = safeDetail;
  }
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

function readRateLimit(res: Response): RateLimitInfo | null {
  const limit = res.headers.get("x-ratelimit-limit");
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  if (limit && remaining && reset) {
    return {
      limit: Number(limit),
      remaining: Number(remaining),
      reset: Number(reset),
    };
  }
  return null;
}

function friendlyError(status: number, body: any): string {
  const message: string =
    (body && (body.message || body.error))?.toString?.() ?? "";
  if (status === 401) {
    return "GitHub rejected the token. Check that your Personal Access Token is valid and not expired.";
  }
  if (status === 403) {
    if (/rate limit/i.test(message)) {
      return "GitHub API rate limit reached. Wait a few minutes and try again.";
    }
    return "Access denied by GitHub. Ensure the token has the `repo` scope for this repository.";
  }
  if (status === 404) {
    return "Repository or resource not found. Verify the owner/repo name and token permissions.";
  }
  if (status === 409) {
    return "The repository is empty or in a conflicted state. Try the “Replace Everything” mode.";
  }
  if (status === 422) {
    return `GitHub rejected the request: ${message || "validation error"}`;
  }
  return `GitHub API error (${status}): ${message || "unknown error"}`;
}

async function ghFetch<T = any>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
    // Token must never be cached anywhere.
    cache: "no-store",
  });

  // Handle empty 204 responses.
  if (res.status === 204) return undefined as T;

  const isJson = (res.headers.get("content-type") || "").includes(
    "application/json",
  );
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const rate = readRateLimit(res);
    let detail = friendlyError(res.status, body);
    if (rate && rate.remaining <= 0) {
      const mins = Math.max(
        1,
        Math.round((rate.reset * 1000 - Date.now()) / 60000),
      );
      detail = `GitHub rate limit reached. Resets in ~${mins} min.`;
    }
    // Internal message is logged server-side only, never includes token.
    throw new GitHubError(res.status, detail, `[${res.status}] ${detail}`);
  }

  return body as T;
}

// ---------------------------------------------------------------------------
// Auth / user
// ---------------------------------------------------------------------------

export async function verifyToken(token: string): Promise<{
  login: string;
  name: string | null;
}> {
  const user = await ghFetch<{ login: string; name: string | null }>(
    token,
    "/user",
  );
  return { login: user.login, name: user.name };
}

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

export async function listRepos(token: string): Promise<RepoInfo[]> {
  const params = new URLSearchParams({
    affiliation: "owner",
    sort: "pushed",
    direction: "desc",
    per_page: "100",
  });
  const repos = await ghFetch<any[]>(token, `/user/repos?${params}`);
  return (repos || []).map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    defaultBranch: r.default_branch ?? null,
    description: r.description ?? null,
    updatedAt: r.updated_at,
    pushedAt: r.pushed_at,
    htmlUrl: r.html_url,
  }));
}

export async function createRepo(
  token: string,
  input: { name: string; private: boolean; description?: string },
): Promise<RepoInfo> {
  const r = await ghFetch<any>(token, "/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      private: input.private,
      description: input.description ?? "",
      auto_init: true,
    }),
  });
  return {
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    defaultBranch: r.default_branch ?? "main",
    description: r.description ?? null,
    updatedAt: r.updated_at,
    pushedAt: r.pushed_at,
    htmlUrl: r.html_url,
  };
}

// ---------------------------------------------------------------------------
// Git Data API — refs, commits, trees, blobs
// ---------------------------------------------------------------------------

export async function getDefaultBranch(
  token: string,
  owner: string,
  repo: string,
): Promise<string> {
  const info = await ghFetch<{ default_branch: string | null }>(
    token,
    `/repos/${owner}/${repo}`,
  );
  if (!info.default_branch) {
    throw new GitHubError(
      409,
      "Repository has no default branch yet. Initialize it or use “Replace Everything”.",
    );
  }
  return info.default_branch;
}

export async function getRef(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ sha: string; objectSha: string }> {
  const ref = await ghFetch<{
    object: { sha: string };
  }>(token, `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  return { sha: `heads/${branch}`, objectSha: ref.object.sha };
}

export async function getCommit(
  token: string,
  owner: string,
  repo: string,
  sha: string,
): Promise<{ treeSha: string; message: string }> {
  const commit = await ghFetch<{
    tree: { sha: string };
    message: string;
  }>(token, `/repos/${owner}/${repo}/git/commits/${sha}`);
  return { treeSha: commit.tree.sha, message: commit.message };
}

export interface RecursiveTree {
  tree: Array<{
    path: string;
    mode: string;
    type: "blob" | "tree" | "commit";
    sha: string;
    size?: number;
  }>;
  truncated: boolean;
}

export async function getRecursiveTree(
  token: string,
  owner: string,
  repo: string,
  treeSha: string,
): Promise<RecursiveTree> {
  return ghFetch<RecursiveTree>(
    token,
    `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
  );
}

export async function createBlob(
  token: string,
  owner: string,
  repo: string,
  contentBase64: string,
  encoding: "base64" | "utf-8" = "base64",
): Promise<{ sha: string; url: string }> {
  const r = await ghFetch<{ sha: string; url: string }>(
    token,
    `/repos/${owner}/${repo}/git/blobs`,
    {
      method: "POST",
      body: JSON.stringify({ content: contentBase64, encoding }),
    },
  );
  return r;
}

export interface TreeItemInput {
  path: string;
  mode: "100644" | "100755" | "040000" | "160000" | "120000";
  type: "blob" | "tree" | "commit";
  sha?: string | null; // null/omitted sha with type "blob" deletes the path (needs base_tree)
  content?: string;
}

export async function createTree(
  token: string,
  owner: string,
  repo: string,
  items: TreeItemInput[],
  baseTreeSha?: string,
): Promise<{ sha: string; url: string }> {
  const r = await ghFetch<{ sha: string; url: string }>(
    token,
    `/repos/${owner}/${repo}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({
        ...(baseTreeSha ? { base_tree: baseTreeSha } : {}),
        tree: items,
      }),
    },
  );
  return r;
}

export async function createCommit(
  token: string,
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parentShas: string[],
): Promise<{ sha: string; html_url: string }> {
  const r = await ghFetch<{ sha: string; html_url: string }>(
    token,
    `/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: treeSha,
        parents: parentShas,
      }),
    },
  );
  return r;
}

export async function updateRef(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  sha: string,
  force = false,
): Promise<void> {
  await ghFetch(
    token,
    `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
    {
      method: "PATCH",
      body: JSON.stringify({ sha, force }),
    },
  );
}

/** Create a branch ref (used when pushing the first commit to an empty repo). */
export async function createRef(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  sha: string,
): Promise<void> {
  await ghFetch(token, `/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
  });
}

/** Fetch the full flat file list (path → sha) for a branch's HEAD tree. */
export async function getExistingFiles(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ files: ExistingFile[]; truncated: boolean }> {
  const ref = await getRef(token, owner, repo, branch);
  const commit = await getCommit(token, owner, repo, ref.objectSha);
  const tree = await getRecursiveTree(
    token,
    owner,
    repo,
    commit.treeSha,
  );
  const files: ExistingFile[] = tree.tree
    .filter((e) => e.type === "blob")
    .map((e) => ({ path: e.path, sha: e.sha }));
  return { files, truncated: tree.truncated };
}

/** Known empty-tree SHA returned by Git for a tree with zero entries. */
export const EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
