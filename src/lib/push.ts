import "server-only";
import {
  createCommit,
  createRef,
  createTree,
  EMPTY_TREE_SHA,
  getCommit,
  getDefaultBranch,
  getExistingFiles,
  getRef,
  GitHubError,
  updateRef,
  type TreeItemInput,
} from "@/lib/github";
import { applyDestination } from "@/lib/zip";
import type {
  BlobRef,
  DiffResult,
  PushMode,
  PushResult,
  StageId,
} from "@/lib/types";

export interface PushInput {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
  mode: PushMode;
  destination: string;
  commitMessage: string;
  blobs: BlobRef[]; // uploaded blobs with SHAs (raw paths, no destination)
}

export type ProgressSink = (e: {
  stage: StageId;
  label: string;
  detail?: string;
  progress?: number;
}) => void;

const STAGES: Record<StageId, string> = {
  preparing: "Preparing files",
  extracting: "Extracting",
  uploading: "Uploading",
  comparing: "Comparing files",
  "creating-objects": "Creating Git objects",
  "creating-commit": "Creating commit",
  updating: "Updating repository",
  complete: "Complete",
  error: "Error",
};

/**
 * Execute a full Git Data API push. Streams progress via `onProgress`.
 *
 * - Replace mode: builds a tree WITHOUT a base tree → repo contains ONLY the
 *   uploaded files. One clean commit.
 * - Smart mode: builds a tree ON TOP of the current HEAD tree, including only
 *   new + changed blobs. Unchanged files are skipped (no API ops).
 */
export async function executePush(
  input: PushInput,
  onProgress: ProgressSink,
): Promise<PushResult> {
  const { token, owner, repo, mode, destination, commitMessage, blobs } = input;

  const branch =
    input.branch || (await getDefaultBranch(token, owner, repo));

  // Resolve current HEAD (parent commit + tree). May not exist on empty repos.
  let parentSha: string | null = null;
  let baseTreeSha: string | null = null;
  try {
    const ref = await getRef(token, owner, repo, branch);
    parentSha = ref.objectSha;
  } catch (e) {
    if (e instanceof GitHubError && (e.status === 404 || e.status === 409)) {
      parentSha = null; // empty repo — will be the first commit
    } else {
      throw e;
    }
  }

  let diff: DiffResult;

  if (mode === "smart") {
    onProgress({
      stage: "comparing",
      label: STAGES.comparing,
      detail: "Reading existing repository tree…",
      progress: 0.35,
    });
    const existing = await getExistingFiles(token, owner, repo, branch).catch(
      () => ({ files: [], truncated: false }),
    );
    const existingByPath = new Map(existing.files.map((e) => [e.path, e.sha]));

    // Need the parent tree SHA as the base so unchanged files persist.
    if (parentSha) {
      const parentCommit = await getCommit(token, owner, repo, parentSha);
      baseTreeSha = parentCommit.treeSha;
    }

    const added: string[] = [];
    const changed: string[] = [];
    const unchanged: string[] = [];
    for (const b of blobs) {
      const fullPath = applyDestination(b.path, destination);
      const existingSha = existingByPath.get(fullPath);
      if (!existingSha) added.push(b.path);
      else if (existingSha === b.sha) unchanged.push(b.path);
      else changed.push(b.path);
    }
    diff = { added, changed, unchanged };

    onProgress({
      stage: "comparing",
      label: STAGES.comparing,
      detail: `${added.length} new · ${changed.length} changed · ${unchanged.length} unchanged`,
      progress: 0.5,
    });
  } else {
    diff = {
      added: blobs.map((b) => b.path),
      changed: [],
      unchanged: [],
    };
    onProgress({
      stage: "comparing",
      label: STAGES.comparing,
      detail: "Replace mode — repository will contain only the uploaded files.",
      progress: 0.4,
    });
  }

  // Build the tree items (only new + changed blobs are needed).
  onProgress({
    stage: "creating-objects",
    label: STAGES["creating-objects"],
    detail: "Building Git tree…",
    progress: 0.6,
  });

  const neededPaths =
    mode === "smart"
      ? new Set([...diff.added, ...diff.changed])
      : new Set(blobs.map((b) => b.path));

  const items: TreeItemInput[] = [];
  for (const b of blobs) {
    if (!neededPaths.has(b.path)) continue;
    items.push({
      path: applyDestination(b.path, destination),
      mode: "100644",
      type: "blob",
      sha: b.sha,
    });
  }

  // Replace → no base_tree (repo becomes ONLY these files).
  // Smart   → base_tree = current HEAD tree (unchanged files inherited).
  const tree = await createTree(
    token,
    owner,
    repo,
    items,
    mode === "smart" ? baseTreeSha ?? undefined : undefined,
  );

  onProgress({
    stage: "creating-commit",
    label: STAGES["creating-commit"],
    detail: "Writing commit object…",
    progress: 0.78,
  });

  const commit = await createCommit(
    token,
    owner,
    repo,
    commitMessage || "Update project via DropToGit",
    tree.sha,
    parentSha ? [parentSha] : [],
  );

  onProgress({
    stage: "updating",
    label: STAGES.updating,
    detail: `Pointing ${branch} at the new commit…`,
    progress: 0.9,
  });

  if (parentSha) {
    await updateRef(
      token,
      owner,
      repo,
      branch,
      commit.sha,
      mode === "replace",
    );
  } else {
    // Empty repo — create the branch ref pointing at the new commit.
    await createRef(token, owner, repo, branch, commit.sha);
  }

  const result: PushResult = {
    commitSha: commit.sha,
    commitUrl: commit.html_url,
    repoUrl: `https://github.com/${owner}/${repo}`,
    repoFullName: `${owner}/${repo}`,
    branch,
    added: diff.added.length,
    changed: diff.changed.length,
    unchanged: diff.unchanged.length,
    total: blobs.length,
    mode,
    commitMessage: commitMessage || "Update project via DropToGit",
  };

  onProgress({
    stage: "complete",
    label: STAGES.complete,
    detail: "Pushed successfully.",
    progress: 1,
  });

  return result;
}

/**
 * Wipe a repository: replace its tree with an empty tree and commit.
 */
export async function executeWipe(
  input: {
    token: string;
    owner: string;
    repo: string;
    branch?: string;
    commitMessage?: string;
  },
  onProgress: ProgressSink,
): Promise<{ commitSha: string; commitUrl: string }> {
  const { token, owner, repo } = input;
  const branch =
    input.branch || (await getDefaultBranch(token, owner, repo));

  onProgress({
    stage: "comparing",
    label: "Reading repository",
    detail: `Inspecting ${branch}…`,
    progress: 0.2,
  });

  const ref = await getRef(token, owner, repo, branch);
  const parentSha = ref.objectSha;

  onProgress({
    stage: "creating-objects",
    label: "Building empty tree",
    detail: "Creating an empty Git tree…",
    progress: 0.5,
  });

  // Create a tree with no entries and no base → empty tree.
  // GitHub returns the well-known empty-tree SHA for `tree: []`.
  const emptyTree = await createTree(token, owner, repo, [], undefined).catch(
    () => ({ sha: EMPTY_TREE_SHA, url: "" }),
  );

  onProgress({
    stage: "creating-commit",
    label: "Creating commit",
    detail: "Writing delete-all commit…",
    progress: 0.7,
  });

  const commit = await createCommit(
    token,
    owner,
    repo,
    input.commitMessage || "Delete all files (via DropToGit)",
    emptyTree.sha,
    [parentSha],
  );

  onProgress({
    stage: "updating",
    label: "Updating repository",
    detail: `Pointing ${branch} at the empty tree…`,
    progress: 0.9,
  });

  await updateRef(token, owner, repo, branch, commit.sha, true);

  onProgress({
    stage: "complete",
    label: "Complete",
    detail: "Repository emptied.",
    progress: 1,
  });

  return { commitSha: commit.sha, commitUrl: commit.html_url };
}
