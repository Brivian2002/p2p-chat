import { NextRequest, NextResponse } from 'next/server';
import { analyzeProject } from '@/lib/analyzer';
import type { ProjectFile } from '@/lib/zip';

export const runtime = 'nodejs';

interface AnalyzeRequest {
  files: Array<{ path: string; size: number; content: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { files: inputFiles } = body;

    if (!Array.isArray(inputFiles) || inputFiles.length === 0) {
      return NextResponse.json(
        { error: 'No files provided for analysis' },
        { status: 400 },
      );
    }

    if (inputFiles.length > 10000) {
      return NextResponse.json(
        { error: 'Too many files for analysis (max 10,000)' },
        { status: 400 },
      );
    }

    // Convert base64 content back to Uint8Array for the analyzer
    const files: ProjectFile[] = inputFiles.map((f) => ({
      path: f.path,
      size: f.size,
      content: f.content ? Uint8Array.from(atob(f.content), (c) => c.charCodeAt(0)) : new Uint8Array(0),
    }));

    const result = analyzeProject(files);

    // Omit binary content from response — only return analysis metadata
    const response = {
      frameworks: result.frameworks,
      totalFiles: result.totalFiles,
      totalFolders: result.totalFolders,
      totalSize: result.totalSize,
      hasGitignore: result.hasGitignore,
      hasGit: result.hasGit,
      largeFiles: result.largeFiles.map(({ path, type, severity, message }) => ({
        path,
        type,
        severity,
        message,
      })),
      secrets: result.secrets.map(({ path, type, severity, message }) => ({
        path,
        type,
        severity,
        message,
      })),
      sensitiveFiles: result.sensitiveFiles.map(({ path, type, severity, message }) => ({
        path,
        type,
        severity,
        message,
      })),
      cleanupSuggestions: result.cleanupSuggestions,
      generatedDirs: result.generatedDirs,
      summary: result.summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
