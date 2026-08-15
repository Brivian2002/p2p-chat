'use client';

import type { AnalysisResult, CleanupSuggestion } from '@/lib/analyzer';
import { formatFileSize } from '@/lib/zip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  FolderTree,
  FileText,
  HardDrive,
  ShieldAlert,
  FileWarning,
  Folder,
  Info,
} from 'lucide-react';

interface ProjectAnalyzerProps {
  analysis: AnalysisResult;
  excludedPaths: Set<string>;
  onToggleExclude: (path: string, excluded: boolean) => void;
  onApplyAll: () => void;
  onClearAll: () => void;
}

// ─── Severity colour maps ──────────────────────────────────────────

const severityStyles: Record<string, { border: string; bg: string; icon: string; badge: string }> = {
  danger: {
    border: 'border-red-500/30 dark:border-red-500/20',
    bg: 'bg-red-500/5 dark:bg-red-500/10',
    icon: 'text-red-500',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
  warning: {
    border: 'border-amber-500/30 dark:border-amber-500/20',
    bg: 'bg-amber-500/5 dark:bg-amber-500/10',
    icon: 'text-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  info: {
    border: 'border-sky-accent/30 dark:border-sky-accent/20',
    bg: 'bg-sky-accent/5 dark:bg-sky-accent/10',
    icon: 'text-sky-accent',
    badge: 'bg-sky-accent/10 text-sky-accent border-sky-accent/20',
  },
};

// ─── Component ─────────────────────────────────────────────────────

export function ProjectAnalyzer({
  analysis,
}: ProjectAnalyzerProps) {
  const allIssues = [
    ...analysis.secrets,
    ...analysis.sensitiveFiles,
    ...analysis.largeFiles,
  ];
  const hasIssues = allIssues.length > 0;
  const hasCleanup = analysis.cleanupSuggestions.length > 0;

  return (
    <div className="space-y-4">
      {/* ── 1. Summary Bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {analysis.frameworks.map((fw) => (
          <Badge
            key={fw.name}
            className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 gap-1.5 px-2.5 py-1"
          >
            <span className="text-xs">{fw.icon}</span>
            {fw.name}
          </Badge>
        ))}

        <div className="flex items-center gap-3 ml-1 text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {analysis.totalFiles} file{analysis.totalFiles !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Folder className="h-3.5 w-3.5" />
            {analysis.totalFolders} folder{analysis.totalFolders !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="h-3.5 w-3.5" />
            {formatFileSize(analysis.totalSize)}
          </span>
        </div>
      </div>

      {analysis.summary && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {analysis.summary}
        </p>
      )}

      {/* ── 2. Issues Section (info only) ──────────────────────── */}
      {hasIssues && (
        <Card className={`overflow-hidden ${allIssues.some((i) => i.severity === 'danger') ? severityStyles.danger.border : severityStyles.warning.border}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${allIssues.some((i) => i.severity === 'danger') ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                <ShieldAlert className={`h-4 w-4 ${allIssues.some((i) => i.severity === 'danger') ? 'text-red-500' : 'text-amber-500'}`} />
              </div>
              <div>
                <CardTitle className="text-base">Issues Detected</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {allIssues.length} issue{allIssues.length !== 1 ? 's' : ''} found — review before pushing
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.secrets.length > 0 && (
                <IssueGroup
                  title="Secret Scanner"
                  issues={analysis.secrets}
                  styles={severityStyles.danger}
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                />
              )}
              {analysis.sensitiveFiles.length > 0 && (
                <IssueGroup
                  title="Sensitive Files"
                  issues={analysis.sensitiveFiles}
                  styles={severityStyles.danger}
                  icon={<FileWarning className="h-3.5 w-3.5" />}
                />
              )}
              {analysis.largeFiles.length > 0 && (
                <IssueGroup
                  title="Large Files"
                  issues={analysis.largeFiles}
                  styles={severityStyles.warning}
                  icon={<HardDrive className="h-3.5 w-3.5" />}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 3. Smart Cleanup (info only — no removal) ───────────── */}
      {hasCleanup && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Detected Artifacts</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {analysis.cleanupSuggestions.length} item{analysis.cleanupSuggestions.length !== 1 ? 's' : ''} detected
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border rounded-lg border border-border">
              {analysis.cleanupSuggestions.map((suggestion) => (
                <InfoRow key={suggestion.path} suggestion={suggestion} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

interface IssueGroupProps {
  title: string;
  issues: AnalysisResult['secrets'] | AnalysisResult['sensitiveFiles'] | AnalysisResult['largeFiles'];
  styles: { border: string; bg: string; icon: string; badge: string };
  icon: React.ReactNode;
}

function IssueGroup({ title, issues, styles, icon }: IssueGroupProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      <div className="space-y-1.5">
        {issues.map((issue, i) => (
          <div
            key={`${issue.path}-${i}`}
            className={`flex items-start gap-2.5 rounded-md ${styles.bg} border ${styles.border} px-3 py-2`}
          >
            <div className={`mt-0.5 shrink-0 ${styles.icon}`}>
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono text-foreground break-all">
                {issue.path}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {issue.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CleanupRowProps {
  suggestion: CleanupSuggestion;
}

function InfoRow({ suggestion }: CleanupRowProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <FolderTree className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-sm font-mono text-foreground truncate">
            {suggestion.path}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 ml-5.5">
          {suggestion.reason}
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{suggestion.fileCount} file{suggestion.fileCount !== 1 ? 's' : ''}</span>
        <span className="w-16 text-right tabular-nums">
          {formatFileSize(suggestion.size)}
        </span>
      </div>
    </div>
  );
}
