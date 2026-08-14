"use client";

import {
  CheckCircle2,
  ExternalLink,
  GitCommitHorizontal,
  GitBranch,
  RotateCcw,
  FilePlus2,
  FileDiff,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/droptogit/Logo";
import type { PushResult } from "@/lib/types";

interface SuccessScreenProps {
  result: PushResult;
  onPushAnother: () => void;
}

export function SuccessScreen({ result, onPushAnother }: SuccessScreenProps) {
  const shortSha = result.commitSha.slice(0, 7);

  const stats = [
    {
      icon: FilePlus2,
      label: "New files",
      value: result.added,
      color: "text-brand-green",
    },
    {
      icon: FileDiff,
      label: "Changed files",
      value: result.changed,
      color: "text-amber-500",
    },
    {
      icon: FileCheck2,
      label: "Unchanged",
      value: result.unchanged,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="animate-float-in mx-auto flex max-w-2xl flex-col items-center gap-6 py-8 text-center">
      <div className="relative">
        <LogoMark size={64} />
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-green text-white shadow-lg">
          <CheckCircle2 className="h-5 w-5" />
        </span>
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Successfully pushed to GitHub!
        </h1>
        <p className="text-muted-foreground">
          Your project is now live in{" "}
          <span className="font-mono font-medium text-foreground">
            {result.repoFullName}
          </span>
        </p>
      </div>

      <div className="grid w-full grid-cols-3 gap-2">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1 rounded-xl border bg-card/50 p-3"
            >
              <Icon className={`h-5 w-5 ${s.color}`} />
              <div className="text-xl font-bold tabular-nums">{s.value}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="w-full space-y-2 rounded-xl border bg-card/50 p-4 text-left">
        <Row icon={<GitCommitHorizontal className="h-4 w-4 text-brand-green" />} label="Commit">
          <code className="font-mono text-sm">{shortSha}</code>
          <span className="text-muted-foreground"> · {result.commitMessage}</span>
        </Row>
        <Row icon={<GitBranch className="h-4 w-4 text-brand-blue" />} label="Branch">
          <code className="font-mono text-sm">{result.branch}</code>
        </Row>
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="gap-1.5">
          <a href={result.repoUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" /> View Repository
          </a>
        </Button>
        <Button asChild variant="secondary" size="lg" className="gap-1.5">
          <a href={result.commitUrl} target="_blank" rel="noopener noreferrer">
            <GitCommitHorizontal className="h-4 w-4" /> View Commit
          </a>
        </Button>
        <Button variant="outline" size="lg" className="gap-1.5" onClick={onPushAnother}>
          <RotateCcw className="h-4 w-4" /> Push Another Project
        </Button>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1 truncate">{children}</div>
    </div>
  );
}
