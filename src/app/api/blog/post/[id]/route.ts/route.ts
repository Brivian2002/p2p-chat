import { NextResponse } from 'next/server';
import { fetchBlogPostById } from '@/lib/blogger';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
  }

  const post = await fetchBlogPostById(id);

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  return NextResponse.json(post);
}
