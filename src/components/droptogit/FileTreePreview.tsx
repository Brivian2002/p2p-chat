"use client";

import * as React from "react";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  File as FileIcon,
  FileCode2,
  FileJson,
  FileText,
  Image as ImageIcon,
  FileTerminal,
  Braces,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/bytes";
import { buildTree, type ProjectFile, type TreeNode } from "@/lib/zip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FileTreePreviewProps {
  files: ProjectFile[];
}

function iconFor(name: string) {
  const lower = name.toLowerCase();
  if (/\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte)$/.test(lower))
    return <FileCode2 className="h-3.5 w-3.5 text-brand-blue" />;
  if (/\.(json)$/.test(lower))
    return <Braces className="h-3.5 w-3.5 text-amber-500" />;
  if (/\.(md|mdx|txt|log)$/.test(lower))
    return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  if (/\.(png|jpe?g|gif|svg|webp|ico|avif)$/.test(lower))
    return <ImageIcon className="h-3.5 w-3.5 text-brand-green" />;
  if (/\.(sh|bash|zsh|py|rb|go|rs|java|c|cpp|cs)$/.test(lower))
    return <FileTerminal className="h-3.5 w-3.5 text-brand-blue" />;
  return <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />;
}

function TreeRow({
  node,
  depth,
  defaultOpen,
}: {
  node: TreeNode;
  depth: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  if (!node.isDir) {
    return (
      <div
        className="flex items-center gap-2 rounded-md py-1 pr-2 text-sm hover:bg-muted/60"
        style={{ paddingLeft: depth * 14 + 8 }}
      >
        <span className="flex h-4 w-4 items-center justify-center">
          {iconFor(node.name)}
        </span>
        <span className="truncate font-mono text-[13px]">{node.name}</span>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {formatBytes(node.size)}
        </span>
      </div>
    );
  }

  const children = Array.from(node.children.values()).sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-sm hover:bg-muted/60"
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
        {open ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-brand-blue" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-brand-blue" />
        )}
        <span className="truncate font-medium">{node.name}</span>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {formatBytes(node.size)}
        </span>
      </button>
      {open && (
        <div>
          {children.map((c) => (
            <TreeRow
              key={c.path}
              node={c}
              depth={depth + 1}
              defaultOpen={depth < 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTreePreview({ files }: FileTreePreviewProps) {
  const tree = React.useMemo(() => buildTree(files), [files]);
  const rootChildren = Array.from(tree.children.values()).sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  if (rootChildren.length === 0) return null;

  return (
    <ScrollArea className="scroll-slim max-h-[22rem] rounded-lg border bg-card/40 p-2">
      <div className="min-w-max">
        {rootChildren.map((c) => (
          <TreeRow key={c.path} node={c} depth={0} defaultOpen />
        ))}
      </div>
    </ScrollArea>
  );
}
