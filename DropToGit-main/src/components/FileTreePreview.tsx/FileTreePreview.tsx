'use client';

import { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatFileSize } from '@/lib/zip';
import { buildFileTree, type TreeNode } from '@/lib/diff';
import type { ProjectFile } from '@/lib/zip';

interface FileTreePreviewProps {
  files: ProjectFile[];
  diffInfo?: {
    newFiles: string[];
    changedFiles: string[];
    unchangedFiles: string[];
  };
  selectable?: boolean;
  selectedPaths?: Set<string>;
  onToggleFile?: (path: string) => void;
  onFileClick?: (file: ProjectFile) => void;
}

function computeDefaultExpanded(files: ProjectFile[]): Set<string> {
  const dirs = new Set<string>();
  for (const f of files) {
    const parts = f.path.split('/');
    for (let i = 1; i <= Math.min(2, parts.length - 1); i++) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }
  return dirs;
}

export function FileTreePreview({
  files,
  diffInfo,
  selectable = false,
  selectedPaths,
  onToggleFile,
  onFileClick,
}: FileTreePreviewProps) {
  const defaultExpanded = useMemo(() => computeDefaultExpanded(files), [files]);
  const filesKey = useMemo(() => files.map((f) => f.path).join('|'), [files]);

  const [state, setState] = useState<{ key: string; expanded: Set<string> }>(() => ({
    key: filesKey,
    expanded: computeDefaultExpanded(files),
  }));

  const expandedDirs = state.key === filesKey ? state.expanded : defaultExpanded;
  const setExpandedDirs = (updater: (prev: Set<string>) => Set<string>) => {
    setState((prev) => {
      if (prev.key !== filesKey) return { key: filesKey, expanded: defaultExpanded };
      return { ...prev, expanded: updater(prev.expanded) };
    });
  };

  if (files.length === 0) return null;

  const tree = buildFileTree(files);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const dirCount = new Set(files.map((f) => f.path.split('/').slice(0, -1).join('/'))).size;

  const selectedCount = selectedPaths ? files.filter((f) => selectedPaths.has(f.path)).length : files.length;

  const getFileBadge = (path: string) => {
    if (!diffInfo) return null;
    if (diffInfo.newFiles.includes(path)) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
          New
        </span>
      );
    }
    if (diffInfo.changedFiles.includes(path)) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-accent/15 text-sky-accent font-medium">
          Changed
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{selectedCount}/{files.length} files</span>
          <span>·</span>
          <span>{dirCount} folders</span>
          <span>·</span>
          <span>{formatFileSize(totalSize)}</span>
        </div>
        <div className="flex items-center gap-2">
          {selectable && (
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => {
                  const filesMap = new Map(files.map((f) => [f.path, f]));
                  // Select/deselect all based on current state
                  const allSelected = selectedPaths && selectedCount === files.length;
                  if (allSelected && onToggleFile) {
                    files.forEach((f) => onToggleFile(f.path));
                  }
                }}
              >
                {selectedCount === files.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => {
              const allDirs = new Set<string>();
              const collectDirs = (node: TreeNode) => {
                if (node.type === 'directory' && node.path) allDirs.add(node.path);
                node.children.forEach(collectDirs);
              };
              collectDirs(tree);
              setExpandedDirs(() => allDirs);
            }}
          >
            Expand all
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card max-h-72 overflow-y-auto scrollbar-thin">
        <div className="p-2">
          <TreeNodes
            nodes={tree.children}
            expandedDirs={expandedDirs}
            toggleDir={(path) =>
              setExpandedDirs((prev) => {
                const next = new Set(prev);
                if (next.has(path)) next.delete(path);
                else next.add(path);
                return next;
              })
            }
            getBadge={getFileBadge}
            selectable={selectable}
            selectedPaths={selectedPaths}
            onToggleFile={onToggleFile}
            onFileClick={onFileClick}
            filesMap={new Map(files.map((f) => [f.path, f]))}
            depth={0}
          />
        </div>
      </div>

      {diffInfo && (
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {diffInfo.newFiles.length} New
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-accent" />
            {diffInfo.changedFiles.length} Changed
          </span>
          {diffInfo.unchangedFiles.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              {diffInfo.unchangedFiles.length} Unchanged
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function TreeNodes({
  nodes,
  expandedDirs,
  toggleDir,
  getBadge,
  selectable,
  selectedPaths,
  onToggleFile,
  onFileClick,
  filesMap,
  depth,
}: {
  nodes: TreeNode[];
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
  getBadge: (path: string) => React.ReactNode;
  selectable: boolean;
  selectedPaths?: Set<string>;
  onToggleFile?: (path: string) => void;
  onFileClick?: (file: ProjectFile) => void;
  filesMap: Map<string, ProjectFile>;
  depth: number;
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.path}>
          <div
            className={`flex items-center gap-1.5 py-1 px-1.5 rounded-md hover:bg-muted/50 transition-colors group ${
              node.type === 'file' && onFileClick ? 'cursor-pointer' : 'cursor-default'
            }`}
            style={{ paddingLeft: `${depth * 16 + 6}px` }}
          >
            {selectable && node.type === 'file' && (
              <Checkbox
                checked={selectedPaths?.has(node.path) ?? true}
                onCheckedChange={() => onToggleFile?.(node.path)}
                className="shrink-0"
                aria-label={`Select ${node.name}`}
              />
            )}

            {node.type === 'directory' ? (
              <button
                className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                onClick={() => toggleDir(node.path)}
                aria-expanded={expandedDirs.has(node.path)}
              >
                {expandedDirs.has(node.path) ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                {expandedDirs.has(node.path) ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-sky-accent" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-sky-accent" />
                )}
                <span className="text-sm truncate">{node.name}</span>
              </button>
            ) : (
              <>
                <span className="w-3.5" />
                <button
                  className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                  onClick={() => onFileClick?.(filesMap.get(node.path)!)}
                  title="Click to preview"
                >
                  <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate">{node.name}</span>
                </button>
                <span className="text-xs text-muted-foreground/60 shrink-0">
                  {node.size !== undefined && formatFileSize(node.size)}
                </span>
                {getBadge(node.path)}
              </>
            )}
          </div>
          {node.type === 'directory' &&
            expandedDirs.has(node.path) &&
            node.children.length > 0 && (
              <TreeNodes
                nodes={node.children}
                expandedDirs={expandedDirs}
                toggleDir={toggleDir}
                getBadge={getBadge}
                selectable={selectable}
                selectedPaths={selectedPaths}
                onToggleFile={onToggleFile}
                onFileClick={onFileClick}
                filesMap={filesMap}
                depth={depth + 1}
              />
            )}
        </div>
      ))}
    </>
  );
}
