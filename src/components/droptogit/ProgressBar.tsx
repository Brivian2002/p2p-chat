"use client";

import * as React from "react";
import {
  Package,
  UploadCloud,
  FileArchive,
  GitCompareArrows,
  Boxes,
  GitCommitHorizontal,
  RefreshCcw,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { StageId } from "@/lib/types";

const STAGES: {
  id: StageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "preparing", label: "Preparing files", icon: Package },
  { id: "extracting", label: "Extracting", icon: FileArchive },
  { id: "uploading", label: "Uploading", icon: UploadCloud },
  { id: "comparing", label: "Comparing files", icon: GitCompareArrows },
  { id: "creating-objects", label: "Creating Git objects", icon: Boxes },
  { id: "creating-commit", label: "Creating commit", icon: GitCommitHorizontal },
  { id: "updating", label: "Updating repository", icon: RefreshCcw },
  { id: "complete", label: "Complete", icon: CheckCircle2 },
];

const ORDER: StageId[] = STAGES.map((s) => s.id);

interface ProgressBarProps {
  stage: StageId;
  detail?: string;
  progress?: number;
  error?: string | null;
}

export function ProgressBar({ stage, detail, progress, error }: ProgressBarProps) {
  const isError = stage === "error" || !!error;
  const currentIndex = ORDER.indexOf(stage);
  const pct =
    typeof progress === "number"
      ? Math.round(progress * 100)
      : stage === "complete"
        ? 100
        : Math.round(((currentIndex + 0.5) / STAGES.length) * 100);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {isError ? "Something went wrong" : STAGES[currentIndex]?.label ?? stage}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {isError ? "" : `${pct}%`}
          </span>
        </div>
        <Progress
          value={isError ? 100 : pct}
          className={cn("h-2", isError && "[&>div]:bg-destructive")}
        />
        {detail && !isError && (
          <p className="text-xs text-muted-foreground">{detail}</p>
        )}
        {isError && (
          <p className="text-xs text-destructive">{error ?? "Operation failed."}</p>
        )}
      </div>

      <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {STAGES.map((s, i) => {
          const state =
            isError && i === currentIndex
              ? "error"
              : i < currentIndex || stage === "complete"
                ? "done"
                : i === currentIndex
                  ? "active"
                  : "pending";
          const Icon = s.icon;
          return (
            <li
              key={s.id}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] transition-colors",
                state === "pending" && "border-border/60 text-muted-foreground/60",
                state === "active" &&
                  "border-primary/50 bg-primary/10 text-primary",
                state === "done" &&
                  "border-primary/30 bg-primary/5 text-primary",
                state === "error" && "border-destructive/50 bg-destructive/10 text-destructive",
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{s.label}</span>
              {state === "active" && (
                <Loader2 className="ml-auto h-3 w-3 shrink-0 animate-spin" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
