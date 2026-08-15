import { NextRequest, NextResponse } from 'next/server';
import { getRepoBranches } from '@/lib/github';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'GitHub token is required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!owner || !repo) {
      return NextResponse.json({ error: 'owner and repo are required' }, { status: 400 });
    }

    const branches = await getRepoBranches(token, owner, repo);
    return NextResponse.json({ branches });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch branches';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
