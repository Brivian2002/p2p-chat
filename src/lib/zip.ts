import JSZip from "jszip";
import type { ProjectFile } from "@/lib/types";

/**
 * Path + archive utilities for DropToGit.
 *
 * SECURITY: every path is sanitized to block traversal (../), absolute paths,
 * null bytes, and writes into `.git/`. No path may escape the repo root.
 */

// Hard limits (enforced before any network call).
export const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100 MB aggregate
export const MAX_FILE_COUNT = 2000;
export const MAX_SINGLE_FILE = 25 * 1024 * 1024; // 25 MB per file

// Extensions that are never meaningful source and are rejected up-front to
// keep the upload lean and avoid surprises.
const BLOCKED_EXTS = new Set([
  ".ds_store",
  ".thumbs.db",
  ".lnk",
]);

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

/** Convert any path to a safe, normalized, forward-slash repo path. */
export function sanitizePath(raw: string): string | null {
  if (!raw) return null;
  // Block null/control bytes outright.
  if (/[\u0000-\u001f]/.test(raw)) return null;

  let p = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  // Strip leading "./" sequences.
  p = p.replace(/^(?:\.\/)+/, "");

  const segments = p.split("/");
  const clean: string[] = [];
  for (const seg of segments) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") return null; // traversal blocked
    if (seg === ".git") return null; // never allow writing into .git
    clean.push(seg);
  }
  if (clean.length === 0) return null;
  return clean.join("/");
}

/** Sanitize a destination subfolder. Returns "" for root. */
export function sanitizeDestination(raw: string): string {
  if (!raw) return "";
  const s = sanitizePath(raw);
  return s ?? "";
}

/** Apply a destination prefix to a sanitized path. */
export function applyDestination(path: string, destination: string): string {
  const dest = sanitizeDestination(destination);
  if (!dest) return path;
  return `${dest}/${path}`;
}

/**
 * If every path shares a single top-level directory, strip it so the folder's
 * *contents* land at the repo root (the expected "upload a folder" behavior).
 */
export function stripCommonRoot(paths: string[]): string[] {
  if (paths.length === 0) return paths;
  const firstSegs = paths.map((p) => p.split("/")[0]);
  // Need at least one nested path for stripping to be meaningful.
  const hasNested = paths.some((p) => p.includes("/"));
  if (!hasNested) return paths;
  const first = firstSegs[0];
  if (!firstSegs.every((s) => s === first)) return paths;
  return paths.map((p) => p.slice(first.length + 1));
}

/** Read a .zip File into sanitized ProjectFiles. */
export async function extractZip(file: File): Promise<ProjectFile[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new UploadError("That doesn’t look like a valid .zip file.");
  }

  const entries: { path: string; entry: JSZip.JSZipObject }[] = [];
  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    // Skip Mac/Windows junk inside zips.
    if (relativePath.startsWith("__MACOSX/")) return;
    const base = relativePath.split("/").pop() ?? "";
    if (BLOCKED_EXTS.has(base.toLowerCase())) return;
    entries.push({ path: relativePath, entry });
  });

  if (entries.length === 0) {
    throw new UploadError("The .zip file contains no files.");
  }

  const rawPaths = entries.map((e) => e.path);
  const stripped = stripCommonRoot(rawPaths);

  const files: ProjectFile[] = [];
  for (let i = 0; i < entries.length; i++) {
    const path = sanitizePath(stripped[i]);
    if (!path) continue;
    const content = await entries[i].entry.async("uint8array");
    files.push({ path, content, size: content.byteLength });
  }
  return dedupeFiles(files);
}

/** Read a FileList (from webkitdirectory folder upload) into ProjectFiles. */
export async function readFolderFiles(
  fileList: File[] | FileList,
): Promise<ProjectFile[]> {
  const files = Array.from(fileList);
  const rawPaths = files.map((f) => (f as any).webkitRelativePath || f.name);
  const stripped = stripCommonRoot(rawPaths);

  const out: ProjectFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const base = f.name;
    if (BLOCKED_EXTS.has(base.toLowerCase())) continue;
    const path = sanitizePath(stripped[i]);
    if (!path) continue;
    const content = new Uint8Array(await f.arrayBuffer());
    out.push({ path, content, size: content.byteLength });
  }
  return dedupeFiles(out);
}

/** Read an arbitrary list of dropped files (no folder structure). */
export async function readLooseFiles(
  fileList: File[] | FileList,
): Promise<ProjectFile[]> {
  const files = Array.from(fileList);
  const out: ProjectFile[] = [];
  for (const f of files) {
    if (BLOCKED_EXTS.has(f.name.toLowerCase())) continue;
    const path = sanitizePath(f.name);
    if (!path) continue;
    const content = new Uint8Array(await f.arrayBuffer());
    out.push({ path, content, size: content.byteLength });
  }
  return dedupeFiles(out);
}

/** Keep the last definition of any duplicate path. */
function dedupeFiles(files: ProjectFile[]): ProjectFile[] {
  const map = new Map<string, ProjectFile>();
  for (const f of files) map.set(f.path, f);
  return Array.from(map.values());
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
  files: ProjectFile[];
}

/** Enforce size + count limits before any network call. */
export function validateFiles(files: ProjectFile[]): ValidationResult {
  if (files.length === 0) {
    return { ok: false, error: "No uploadable files were found.", files: [] };
  }
  if (files.length > MAX_FILE_COUNT) {
    return {
      ok: false,
      error: `Too many files (${files.length}). The limit is ${MAX_FILE_COUNT}.`,
      files: [],
    };
  }
  let total = 0;
  for (const f of files) {
    total += f.size;
    if (f.size > MAX_SINGLE_FILE) {
      return {
        ok: false,
        error: `"${f.path}" is larger than the ${Math.round(
          MAX_SINGLE_FILE / 1024 / 1024,
        )} MB per-file limit.`,
        files: [],
      };
    }
  }
  if (total > MAX_TOTAL_SIZE) {
    return {
      ok: false,
      error: `Total size (${Math.round(
        total / 1024 / 1024,
      )} MB) exceeds the ${Math.round(
        MAX_TOTAL_SIZE / 1024 / 1024,
      )} MB upload limit.`,
      files: [],
    };
  }
  return { ok: true, files };
}

export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  children: Map<string, TreeNode>;
}

/** Build a nested tree for the file preview. */
export function buildTree(files: ProjectFile[]): TreeNode {
  const root: TreeNode = {
    name: "",
    path: "",
    isDir: true,
    size: 0,
    children: new Map(),
  };
  for (const f of files) {
    const segs = f.path.split("/");
    let cur = root;
    for (let i = 0; i < segs.length; i++) {
      const name = segs[i];
      const isLast = i === segs.length - 1;
      if (!cur.children.has(name)) {
        cur.children.set(name, {
          name,
          path: segs.slice(0, i + 1).join("/"),
          isDir: !isLast,
          size: 0,
          children: new Map(),
        });
      }
      cur = cur.children.get(name)!;
      if (isLast) {
        cur.size = f.size;
      }
    }
  }
  computeDirSizes(root);
  return root;
}

function computeDirSizes(node: TreeNode): number {
  if (!node.isDir) return node.size;
  let total = 0;
  for (const child of node.children.values()) {
    total += computeDirSizes(child);
  }
  node.size = total;
  return total;
}
