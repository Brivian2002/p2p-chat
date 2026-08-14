import type { DiffResult, ExistingFile, ProjectFile } from "@/lib/types";

/**
 * Compare uploaded files against the existing repository tree.
 *
 * Smart Update only sends NEW and CHANGED files to GitHub; UNCHANGED files
 * are skipped entirely (no blob creation, no tree entry) because the base
 * tree already references the same blob SHA.
 *
 * Comparison is by Git blob SHA, which already encodes content — so two files
 * with identical bytes produce identical SHAs regardless of path.
 */

/** Async Git blob SHA-1 computation. */
export async function computeGitBlobShaAsync(
  content: Uint8Array,
): Promise<string> {
  const header = `blob ${content.byteLength}\u0000`;
  const headerBytes = new TextEncoder().encode(header);
  const buf = new Uint8Array(headerBytes.byteLength + content.byteLength);
  buf.set(headerBytes, 0);
  buf.set(content, headerBytes.byteLength);

  // Web Crypto supports SHA-1 in both browser and Node 18+.
  const digest = await crypto.subtle.digest("SHA-1", buf);
  return toHex(new Uint8Array(digest));
}

function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export interface DiffInput {
  uploaded: ProjectFile[];
  existing: ExistingFile[];
  /** Uploaded files with their locally-computed blob SHAs. */
  uploadedShas: Map<string, string>;
}

export function diffFiles(input: DiffInput): DiffResult {
  const existingByPath = new Map(input.existing.map((e) => [e.path, e.sha]));

  const added: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];

  for (const f of input.uploaded) {
    const existingSha = existingByPath.get(f.path);
    const newSha = input.uploadedShas.get(f.path);
    if (!existingSha) {
      added.push(f.path);
    } else if (newSha && newSha === existingSha) {
      unchanged.push(f.path);
    } else {
      changed.push(f.path);
    }
  }

  return { added, changed, unchanged };
}

/** Files that actually need a blob upload (added + changed). */
export function filesNeedingUpload(
  uploaded: ProjectFile[],
  diff: DiffResult,
): ProjectFile[] {
  const needed = new Set([...diff.added, ...diff.changed]);
  return uploaded.filter((f) => needed.has(f.path));
}
