'use client';

import { useState, useEffect, useRef } from 'react';
import type { AnalysisResult } from '@/lib/analyzer';
import { uint8ArrayToBase64 } from '@/lib/zip';
import { ProjectAnalyzer } from '@/components/ProjectAnalyzer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store';
import { Brain, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

// The API returns the same analysis shape consumed by the display component.
type AnalysisResponse = AnalysisResult;

export function AnalysisSection() {
  const files = useAppStore((s) => s.files);

  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const prevFilesHashRef = useRef<string>('');

  // ── Run analysis when files change ────────────────────────────
  useEffect(() => {
    if (files.length === 0) {
      prevFilesHashRef.current = '';
      return;
    }

    // Simple hash to avoid re-analyzing the same file set
    const hash = files.map((f) => `${f.path}:${f.size}`).join('|');
    if (hash === prevFilesHashRef.current) return;
    prevFilesHashRef.current = hash;

    let cancelled = false;

    async function runAnalysis() {
      setLoading(true);

      // Prepare lightweight payload — only send paths and sizes, plus content for secret scanning
      const payload = files.map((f) => ({
        path: f.path,
        size: f.size,
        content: f.content.length > 0 && f.size < 500_000
          ? uint8ArrayToBase64(f.content)
          : '',
      }));

      try {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: payload }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Analysis failed' }));
          throw new Error(data.error || `Analysis failed (${res.status})`);
        }

        const result = (await res.json()) as AnalysisResponse;
        if (!cancelled) {
          setAnalysis(result);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Analysis failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    runAnalysis();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [files]);

  // ── Render ────────────────────────────────────────────────────

  if (files.length === 0) return null;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-accent/10">
              {loading ? (
                <Loader2 className="h-4 w-4 text-sky-accent animate-spin" />
              ) : (
                <Brain className="h-4 w-4 text-sky-accent" />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Project Analysis</CardTitle>
              <p className="text-xs text-muted-foreground">
                {loading
                  ? 'Analyzing your project…'
                  : analysis
                    ? 'Analysis complete'
                    : 'Waiting for analysis…'}
              </p>
            </div>
            {analysis && !loading && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                onClick={() => {
                  prevFilesHashRef.current = '';
                  setAnalysis(null);
                }}
              >
                <RotateCcw className="h-3 w-3" />
                Re-analyze
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          )}

          {analysis && !loading && (
            <ProjectAnalyzer
              analysis={analysis}
              excludedPaths={new Set()}
              onToggleExclude={() => {}}
              onApplyAll={() => {}}
              onClearAll={() => {}}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
