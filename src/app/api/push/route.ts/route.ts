import { NextRequest, NextResponse } from 'next/server';
import {
  getRefSha,
  getCommitTreeSha,
  getTreeRecursive,
  getFileContent,
  createBlob,
  createTree,
  createCommit,
  updateRef,
  getDefaultBranch,
  sanitizePath,
  getOwnerFromToken,
  type GitHubTreeEntry,
} from '@/lib/github';
import { uint8ArrayToBase64 } from '@/lib/zip';

export const maxDuration = 300;

interface FileEntry {
  path: string;
  content: string; // base64
  size: number;
}

async function notifyProgress(
  controller: ReadableStreamDefaultController,
  stage: string,
  current: number,
  total: number,
  message?: string
) {
  const data = JSON.stringify({
    type: 'progress',
    stage,
    current,
    total,
    message: message || `${stage}: ${current}/${total}`,
    timestamp: Date.now(),
  });
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
}

async function sendError(
  controller: ReadableStreamDefaultController,
  error: string
) {
  const data = JSON.stringify({
    type: 'error',
    error,
    timestamp: Date.now(),
  });
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
}

async function sendSuccess(
  controller: ReadableStreamDefaultController,
  result: {
    commitSha: string;
    commitUrl: string;
    repoUrl: string;
    filesUploaded: number;
    filesChanged: number;
  }
) {
  const data = JSON.stringify({
    type: 'success',
    ...result,
    timestamp: Date.now(),
  });
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'GitHub token is required' }, { status: 401 });
  }

  const body = await request.json();
  const { owner, repo, files, commitMessage, mode, destination, branch: branchOverride } = body;

  if (!owner || !repo || !files || !commitMessage) {
    return NextResponse.json(
      { error: 'Missing required fields: owner, repo, files, commitMessage' },
      { status: 400 }
    );
  }

  const fileEntries: FileEntry[] = files;

  // Validate mode
  if (mode !== 'replace' && mode !== 'smart') {
    return NextResponse.json({ error: 'Invalid mode. Use "replace" or "smart".' }, { status: 400 });
  }

  // Sanitize destination
  let destPrefix = '';
  if (destination) {
    try {
      destPrefix = sanitizePath(destination);
      if (destPrefix) destPrefix += '/';
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid destination path' },
        { status: 400 }
      );
    }
  }

  // Sanitize all file paths
  for (const f of fileEntries) {
    try {
      sanitizePath(f.path);
    } catch {
      return NextResponse.json(
        { error: `Invalid file path detected: ${f.path}` },
        { status: 400 }
      );
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Get default branch
        await notifyProgress(controller, 'Preparing', 0, 1, 'Getting repository info...');
        let branch: string;
        if (branchOverride && branchOverride.trim()) {
          branch = branchOverride.trim();
        } else {
          try {
            branch = await getDefaultBranch(token, owner, repo);
          } catch {
            branch = 'main';
          }
        }

        // 2. Get current ref SHA
        await notifyProgress(controller, 'Preparing', 1, 1, 'Getting current branch state...');
        let parentSha: string | null = null;
        let baseTreeSha: string | null = null;

        try {
          parentSha = await getRefSha(token, owner, repo, branch);
          baseTreeSha = await getCommitTreeSha(token, owner, repo, parentSha);
        } catch {
          // Empty repo - no commits yet
          parentSha = null;
          baseTreeSha = null;
        }

        // 3. For smart mode, get existing tree
        let existingTree: Map<string, GitHubTreeEntry> = new Map();
        if (mode === 'smart' && baseTreeSha) {
          await notifyProgress(controller, 'Comparing files', 0, 1, 'Fetching existing file tree...');
          try {
            const treeEntries = await getTreeRecursive(token, owner, repo, baseTreeSha);
            for (const entry of treeEntries) {
              existingTree.set(entry.path, entry);
            }
          } catch {
            // If we can't get the tree, treat all files as new
          }
        }

        // 4. Upload files as blobs
        await notifyProgress(controller, 'Uploading', 0, fileEntries.length, 'Creating file blobs...');

        let filesUploaded = 0;
        let filesChanged = 0;
        const treeItems: { path: string; mode: string; type: 'blob'; sha: string }[] = [];

        for (let i = 0; i < fileEntries.length; i++) {
          const file = fileEntries[i];
          const fullPath = destPrefix + file.path;

          // For smart mode: check if file exists and has same content
          if (mode === 'smart' && existingTree.has(fullPath)) {
            const existing = existingTree.get(fullPath)!;
            // We can't easily compare content without fetching, so we'll upload all
            // but we can skip if the file hasn't changed by comparing sizes as a heuristic
            // Actually for correctness, let's just upload everything in smart mode too
            // but keep existing files that aren't in the upload
            filesChanged++;
          } else if (mode === 'smart') {
            filesUploaded++;
          } else {
            filesUploaded++;
          }

          // Create blob
          const blob = await createBlob(token, owner, repo, file.content, 'base64');
          treeItems.push({
            path: fullPath,
            mode: '100644',
            type: 'blob',
            sha: blob.sha,
          });

          await notifyProgress(
            controller,
            'Uploading',
            i + 1,
            fileEntries.length,
            `Uploading ${file.path}...`
          );

          // Rate limit: small delay every 50 files
          if ((i + 1) % 50 === 0) {
            await new Promise((r) => setTimeout(r, 100));
          }
        }

        // 5. For smart mode, keep existing files that aren't being updated
        if (mode === 'smart' && baseTreeSha) {
          const uploadedPaths = new Set(treeItems.map((t) => t.path));
          for (const [path, entry] of existingTree) {
            if (!uploadedPaths.has(path) && entry.sha) {
              treeItems.push({
                path,
                mode: '100644',
                type: 'blob',
                sha: entry.sha,
              });
            }
          }
        }

        // 6. Create tree
        await notifyProgress(controller, 'Creating Git objects', 0, 1, 'Creating tree object...');

        // GitHub API has a limit of 100K entries per tree, but we'll batch if needed
        // For most projects, single tree is fine
        const newTree = await createTree(
          token,
          owner,
          repo,
          mode === 'smart' ? baseTreeSha : null,
          treeItems
        );

        // 7. Create commit
        await notifyProgress(controller, 'Creating commit', 0, 1, 'Creating commit...');

        const parents = parentSha ? [parentSha] : [];
        const commit = await createCommit(
          token,
          owner,
          repo,
          commitMessage,
          newTree.sha,
          parents.length > 0 ? parents : '4b825dc642cb6eb9a060e54bf899d15006895fb3' // empty tree SHA
        );

        // 8. Update ref
        await notifyProgress(controller, 'Updating repository', 0, 1, 'Updating branch reference...');

        if (parentSha) {
          await updateRef(token, owner, repo, branch, commit.sha);
        } else {
          // Create the ref (initial commit)
          const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/refs`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'DropToGit',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ref: `refs/heads/${branch}`,
                sha: commit.sha,
              }),
            }
          );
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Failed to create branch reference: ${res.status} ${text}`);
          }
        }

        // 9. Done!
        await sendSuccess(controller, {
          commitSha: commit.sha,
          commitUrl: commit.html_url,
          repoUrl: `https://github.com/${owner}/${repo}`,
          filesUploaded,
          filesChanged,
        });

        await notifyProgress(controller, 'Complete', 1, 1, 'Done!');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'An unexpected error occurred';
        await sendError(controller, message);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
