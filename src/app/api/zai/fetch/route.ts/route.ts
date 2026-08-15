import { NextResponse } from 'next/server';

type ZaiFile = { path: string; content: string };

/**
 * Fetch code files from a z.ai chat session.
 *
 * Uses the user's account ID and the specific chat ID
 * to retrieve all code files built in that session.
 *
 * Environment variables:
 *   ZAI_API_BASE — override the z.ai API base URL (default: https://z.ai)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, chatId } = body as {
      userId?: string;
      chatId?: string;
    };

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 },
      );
    }

    if (!chatId || typeof chatId !== 'string') {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 },
      );
    }

    const apiBase = process.env.ZAI_API_BASE || 'https://z.ai';

    // ── Fetch files from the user's chat session ─────────────
    const filesRes = await fetch(
      `${apiBase}/api/v1/users/${userId}/chats/${chatId}/files`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!filesRes.ok) {
      const status = filesRes.status;
      if (status === 404) {
        return NextResponse.json(
          { error: 'Chat not found — check your User ID and Chat ID' },
          { status: 404 },
        );
      }
      if (status === 403) {
        return NextResponse.json(
          { error: 'Access denied — this chat may belong to a different user' },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: `z.ai API error (${status})` },
        { status: 502 },
      );
    }

    const filesData = await filesRes.json();

    // Handle different response shapes
    let rawFiles: ZaiFile[] = [];

    if (Array.isArray(filesData.files)) {
      rawFiles = filesData.files;
    } else if (Array.isArray(filesData)) {
      rawFiles = filesData;
    } else if (filesData.items) {
      rawFiles = filesData.items;
    }

    if (rawFiles.length === 0) {
      return NextResponse.json(
        { error: 'No files found in this chat session' },
        { status: 404 },
      );
    }

    // ── Convert to ProjectFile format ────────────────────────
    const files = rawFiles.map((f: ZaiFile) => {
      // Sanitize path
      let path = f.path.replace(/\\/g, '/').replace(/^\/+/, '');
      if (path.includes('..') || path.includes('\0')) {
        path = path.replace(/\.\./g, '_');
      }

      // Decode content (base64 or plain text)
      let content: Uint8Array;
      try {
        const decoded = atob(f.content);
        content = new TextEncoder().encode(decoded);
      } catch {
        content = new TextEncoder().encode(f.content);
      }

      return {
        path,
        content: Array.from(content),
        size: content.length,
      };
    });

    const totalSize = files.reduce((sum: number, f: { size: number }) => sum + f.size, 0);

    return NextResponse.json({
      files,
      totalSize,
      count: files.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch from z.ai';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
