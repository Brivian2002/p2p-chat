import { NextRequest, NextResponse } from 'next/server';
import { listRepos, createRepo, getOwnerFromToken, validateRepoName } from '@/lib/github';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'GitHub token is required' }, { status: 401 });
    }

    const repos = await listRepos(token);
    return NextResponse.json({ repos });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch repositories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'GitHub token is required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isPrivate } = body;

    if (!name) {
      return NextResponse.json({ error: 'Repository name is required' }, { status: 400 });
    }

    const validatedName = validateRepoName(name);
    const repo = await createRepo(token, validatedName, description || '', isPrivate || false);

    return NextResponse.json({ repo });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create repository';
    const status = message.includes('already exists') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
