'use client';

import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface ProgressStage {
  stage: string;
  message: string;
  current: number;
  total: number;
}

interface ProgressBarProps {
  stages: ProgressStage[];
 currentStage: number;
  isComplete: boolean;
  error?: string;
}

const STAGE_ICONS = {
  Preparing: '📦',
  Comparing: '🔍',
  Uploading: '☁️',
  'Creating Git objects': '🌳',
  'Creating commit': '📝',
  'Updating repository': '🚀',
  Complete: '✅',
};

export function ProgressBar({ stages, currentStage, isComplete, error }: ProgressBarProps) {
  const current = stages[currentStage];
  const progress = current
    ? current.total > 0
      ? Math.round((current.current / current.total) * 100)
      : 0
    : 0;

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
          <div>
            <p className="font-semibold text-destructive">Push Failed</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      {!isComplete && (
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="font-semibold">Pushing to GitHub...</p>
            <p className="text-sm text-muted-foreground">
              {current?.message || 'Starting...'}
            </p>
          </div>
        </div>
      )}

      {isComplete && (
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <p className="font-semibold">Push Complete!</p>
        </div>
      )}

      {/* Stage pipeline */}
      <div className="space-y-2">
        {stages.map((stage, i) => {
          const isActive = i === currentStage;
          const isDone = i < currentStage || isComplete;
          const icon = STAGE_ICONS[stage.stage as keyof typeof STAGE_ICONS] || '📋';

          return (
            <div
              key={i}
              className={`flex items-center gap-2.5 text-sm transition-all duration-300 ${
                isDone
                  ? 'text-muted-foreground line-through opacity-60'
                  : isActive
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground/40'
              }`}
            >
              <span className="w-5 text-center shrink-0">
                {isDone ? '✓' : isActive ? icon : '○'}
              </span>
              <span className="flex-1 truncate">{stage.stage}</span>
              {isActive && stage.total > 1 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {stage.current}/{stage.total}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      {!isComplete && current && current.total > 1 && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right tabular-nums">
            {progress}%
          </p>
        </div>
      )}
    </div>
  );
}
