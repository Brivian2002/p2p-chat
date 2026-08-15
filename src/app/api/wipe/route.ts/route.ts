import { NextRequest, NextResponse } from 'next/server';
import {
  getRefSha,
  getCommitTreeSha,
  createCommit,
  updateRef,
  getDefaultBranch,
  sanitizePath,
} from '@/lib/github';

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'GitHub token is required' }, { status: 401 });
  }

  const body = await request.json();
  const { owner, repo, confirmRepoName } = body;

  if (!owner || !repo) {
    return NextResponse.json(
      { error: 'Missing required fields: owner, repo' },
      { status: 400 }
    );
  }

  // Verify confirmation
  if (confirmRepoName !== repo) {
    return NextResponse.json(
      { error: 'Repository name confirmation does not match' },
      { status: 400 }
    );
  }

  try {
    // Get default branch
    let branch: string;
    try {
      branch = await getDefaultBranch(token, owner, repo);
    } catch {
      branch = 'main';
    }

    // Get current commit
    const parentSha = await getRefSha(token, owner, repo, branch);

    // Create empty tree (using the well-known empty tree SHA)
    const emptyTreeSha = '4b825dc642cb6eb9a060e54bf899d15006895fb3';

    // Create commit with empty tree
    const commit = await createCommit(
      token,
      owner,
      repo,
      'Delete all files',
      emptyTreeSha,
      [parentSha]
    );

    // Update ref
    await updateRef(token, owner, repo, branch, commit.sha);

    return NextResponse.json({
      success: true,
      commitSha: commit.sha,
      message: `All files deleted from ${owner}/${repo}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete files';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
