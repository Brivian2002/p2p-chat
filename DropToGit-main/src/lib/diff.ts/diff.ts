export interface DiffResult {
  newFiles: string[];
  changedFiles: string[];
  unchangedFiles: string[];
  deletedFiles: string[];
}

export interface ExistingFile {
  path: string;
  sha: string;
  size: number;
}

// Compare uploaded files with existing repo files
// Returns what's new, changed, unchanged, and what would be deleted (in replace mode)
export function computeDiff(
  uploadedPaths: string[],
  existingFiles: ExistingFile[],
  mode: 'replace' | 'smart'
): DiffResult {
  const existingMap = new Map(existingFiles.map((f) => [f.path, f]));
  const uploadedSet = new Set(uploadedPaths);

  const newFiles: string[] = [];
  const changedFiles: string[] = [];
  const unchangedFiles: string[] = [];
  const deletedFiles: string[] = [];

  for (const path of uploadedPaths) {
    const existing = existingMap.get(path);
    if (!existing) {
      newFiles.push(path);
    }
    // Note: We can't truly detect "changed" without comparing content/sha
    // which requires fetching. For smart update, we consider everything as
    // potentially changed unless we do a deeper check. We'll mark files that
    // exist in both as "potentially unchanged" and the push logic will handle it.
  }

  // For smart mode: files in repo but not in upload are "unchanged" (kept)
  // For replace mode: files in repo but not in upload are "deleted"
  for (const existing of existingFiles) {
    if (!uploadedSet.has(existing.path)) {
      if (mode === 'replace') {
        deletedFiles.push(existing.path);
      }
    } else {
      unchangedFiles.push(existing.path);
    }
  }

  // Any uploaded file not in existing is new
  for (const path of uploadedPaths) {
    if (!existingMap.has(path)) {
      newFiles.push(path);
    } else {
      // File exists in both - for smart update we can't know without SHA comparison
      // We'll upload all and let the API handle it, but report them as potentially changed
      changedFiles.push(path);
    }
  }

  return { newFiles, changedFiles, unchangedFiles, deletedFiles };
}

// Build a nested tree structure from file paths
export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: TreeNode[];
  size?: number;
}

export function buildFileTree(
  files: { path: string; size: number }[]
): TreeNode {
  const root: TreeNode = {
    name: 'root',
    path: '',
    type: 'directory',
    children: [],
  };

  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sortedFiles) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join('/');

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: fullPath,
          type: isFile ? 'file' : 'directory',
          children: [],
          ...(isFile ? { size: file.size } : {}),
        };
        current.children.push(child);
      }

      current = child;
    }
  }

  // Sort: directories first, then files, both alphabetically
  const sortChildren = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortChildren);
  };
  sortChildren(root);

  return root;
}
