"use client";

import { Files, HardDrive, FolderTree } from "lucide-react";
import { formatBytes } from "@/lib/bytes";
import type { ProjectFile } from "@/lib/zip";

interface UploadStatsProps {
  files: ProjectFile[];
}

export function UploadStats({ files }: UploadStatsProps) {
  const count = files.length;
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const folders = new Set<string>();
  for (const f of files) {
    const parts = f.path.split("/");
    for (let i = 1; i < parts.length; i++) folders.add(parts.slice(0, i).join("/"));
  }

  const stats = [
    { label: "Files", value: count.toLocaleString(), icon: Files },
    { label: "Size", value: formatBytes(totalSize), icon: HardDrive },
    { label: "Folders", value: folders.size.toLocaleString(), icon: FolderTree },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-2"
          >
            <Icon className="h-4 w-4 text-brand-green" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tabular-nums">
                {s.value}
              </div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
