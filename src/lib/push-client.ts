"use client";

import { bytesToBase64 } from "@/lib/bytes";
import { readProgressStream } from "@/lib/sse";
import type { BlobRef, ProjectFile, ProgressEvent, PushResult } from "@/lib/types";

const API_BASE = "";

/** Target ~2 MB of raw bytes per batch to stay within serverless body limits. */
const BATCH_BYTES = 2 * 1024 * 1024;

export interface StageSink {
  (e: {
    stage: ProgressEvent["stage"];
    label: string;
    detail?: string;
    progress?: number;
  }): void;
}

/** Group files into size-bounded batches (large files get their own batch). */
function chunkFiles(files: ProjectFile[]): ProjectFile[][] {
  const batches: ProjectFile[][] = [];
  let cur: ProjectFile[] = [];
  let curBytes = 0;
  for (const f of files) {
    const would = curBytes + f.size;
    if (cur.length > 0 && would > BATCH_BYTES) {
      batches.push(cur);
      cur = [];
      curBytes = 0;
    }
    cur.push(f);
    curBytes += f.size;
  }
  if (cur.length > 0) batches.push(cur);
  return batches;
}

/**
 * Create Git blobs for every uploaded file in size-bounded batches.
 * Reports per-file upload progress.
 */
export async function createBlobsChunked(
  params: {
    token: string;
    owner: string;
    repo: string;
    files: ProjectFile[];
  },
  onProgress: StageSink,
): Promise<BlobRef[]> {
  const batches = chunkFiles(params.files);
  const blobs: BlobRef[] = [];
  let done = 0;
  const total = params.files.length;

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    const payload = {
      token: params.token,
      owner: params.owner,
      repo: params.repo,
      files: batch.map((f) => ({
        path: f.path,
        content: bytesToBase64(f.content),
      })),
    };

    const res = await fetch(`${API_BASE}/api/push/blobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = `Upload failed (batch ${bi + 1}).`;
      try {
        const j = await res.json();
        if (j?.error) msg = j.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }

    const data = (await res.json()) as { blobs: BlobRef[] };
    for (const b of data.blobs) {
      blobs.push(b);
      done++;
      onProgress({
        stage: "uploading",
        label: "Uploading",
        detail: `${done} / ${total} files uploaded`,
        progress: 0.12 + 0.22 * (done / total),
      });
    }
  }

  return blobs;
}

/** Stream the final commit operation and resolve with the PushResult. */
export async function commitPush(
  params: {
    token: string;
    owner: string;
    repo: string;
    branch?: string;
    mode: "replace" | "smart";
    destination: string;
    commitMessage: string;
    blobs: BlobRef[];
  },
  onProgress: StageSink,
): Promise<PushResult> {
  const res = await fetch(`${API_BASE}/api/push/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok || !res.body) {
    let msg = "Push failed to start.";
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  let result: PushResult | null = null;
  for await (const ev of readProgressStream(res)) {
    onProgress({
      stage: ev.stage,
      label: ev.label,
      detail: ev.detail,
      progress: ev.progress,
    });
    if (ev.stage === "complete" && ev.result) {
      result = ev.result;
    }
    if (ev.stage === "error") {
      throw new Error(ev.error || "Push failed.");
    }
  }

  if (!result) throw new Error("Push completed without a result.");
  return result;
}

/** Stream the wipe operation. */
export async function wipeRepo(
  params: {
    token: string;
    owner: string;
    repo: string;
    branch?: string;
  },
  onProgress: StageSink,
): Promise<PushResult> {
  const res = await fetch(`${API_BASE}/api/wipe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok || !res.body) {
    let msg = "Wipe failed to start.";
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  let result: PushResult | null = null;
  for await (const ev of readProgressStream(res)) {
    onProgress({
      stage: ev.stage,
      label: ev.label,
      detail: ev.detail,
      progress: ev.progress,
    });
    if (ev.stage === "complete" && ev.result) result = ev.result;
    if (ev.stage === "error") throw new Error(ev.error || "Wipe failed.");
  }
  if (!result) throw new Error("Wipe completed without a result.");
  return result;
}

/** Fetch the user's repositories. */
export async function fetchRepos(
  token: string,
): Promise<{ login: string; repos: any[] }> {
  const res = await fetch(`${API_BASE}/api/repos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load repositories.");
  return data;
}

/** Create a new repository. */
export async function createRepoApi(
  token: string,
  input: { name: string; private: boolean; description?: string },
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/repos/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, ...input }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to create repository.");
  return data.repo;
}

/** Fetch the existing file list (path → sha) of a repository branch. */
export async function fetchExistingFiles(
  token: string,
  owner: string,
  repo: string,
  branch?: string,
): Promise<{ files: { path: string; sha: string }[]; truncated: boolean; branch: string | null }> {
  const res = await fetch(`${API_BASE}/api/repos/tree`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, owner, repo, branch }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to read repository tree.");
  return data;
}
