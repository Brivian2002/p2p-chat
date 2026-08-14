// Shared types for DropToGit (used by client + server).

export type PushMode = "replace" | "smart";

export interface ProjectFile {
  /** Sanitized, forward-slash, repo-relative path (no leading slash, no ..). */
  path: string;
  /** Raw file bytes. */
  content: Uint8Array;
  /** Original size in bytes (content.byteLength). */
  size: number;
}

export interface BlobRef {
  path: string;
  sha: string;
  size: number;
}

export interface TreeEntry {
  path: string;
  sha: string;
  type: "blob" | "tree";
  mode: "100644" | "100755" | "040000" | "160000" | "120000";
}

export interface ExistingFile {
  path: string;
  sha: string;
}

export interface DiffResult {
  added: string[];
  changed: string[];
  unchanged: string[];
}

export type StageId =
  | "preparing"
  | "extracting"
  | "uploading"
  | "comparing"
  | "creating-objects"
  | "creating-commit"
  | "updating"
  | "complete"
  | "error";

export interface ProgressEvent {
  stage: StageId;
  label: string;
  detail?: string;
  /** 0..1 progress within the whole pipeline (optional). */
  progress?: number;
  /** Terminal payload — present on the final event. */
  result?: PushResult;
  error?: string;
}

export interface PushResult {
  commitSha: string;
  commitUrl: string;
  repoUrl: string;
  repoFullName: string;
  branch: string;
  added: number;
  changed: number;
  unchanged: number;
  total: number;
  mode: PushMode;
  commitMessage: string;
}

export interface RepoInfo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string | null;
  description: string | null;
  updatedAt: string;
  pushedAt: string;
  htmlUrl: string;
}
