"use client";

import * as React from "react";
import {
  UploadCloud,
  FolderUp,
  FileArchive,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  extractZip,
  readFolderFiles,
  readLooseFiles,
  UploadError,
  validateFiles,
  type ProjectFile,
} from "@/lib/zip";

interface DropzoneProps {
  onFiles: (files: ProjectFile[]) => void;
  disabled?: boolean;
}

export function Dropzone({ onFiles, disabled }: DropzoneProps) {
  const [dragging, setDragging] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);
  const zipInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dragDepth = React.useRef(0);

  const handleProjectFiles = React.useCallback(
    async (files: ProjectFile[]) => {
      const result = validateFiles(files);
      if (!result.ok) {
        setError(result.error ?? "Invalid files.");
        return;
      }
      setError(null);
      onFiles(result.files);
    },
    [onFiles],
  );

  const processZip = React.useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const files = await extractZip(file);
        await handleProjectFiles(files);
      } catch (e: any) {
        setError(e instanceof UploadError ? e.message : "Could not read the .zip file.");
      } finally {
        setBusy(false);
      }
    },
    [handleProjectFiles],
  );

  const processFileList = React.useCallback(
    async (list: FileList | File[], kind: "folder" | "loose") => {
      setBusy(true);
      setError(null);
      try {
        const files =
          kind === "folder"
            ? await readFolderFiles(list)
            : await readLooseFiles(list);
        // If a single zip was dropped among loose files, handle it as a zip.
        const arr = Array.from(list);
        if (kind === "loose" && arr.length === 1 && arr[0].name.toLowerCase().endsWith(".zip")) {
          await processZip(arr[0]);
          return;
        }
        await handleProjectFiles(files);
      } catch (e: any) {
        setError(e?.message ?? "Could not read the files.");
      } finally {
        setBusy(false);
      }
    },
    [handleProjectFiles, processZip],
  );

  // ---- Drag & drop with folder traversal via FileSystemEntry ----
  const onDragEnter = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    dragDepth.current++;
    setDragging(true);
  };
  const onDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    dragDepth.current--;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  };
  const onDrop = async (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);

    const dt = e.dataTransfer;
    const items = dt.items;
    setBusy(true);
    setError(null);
    try {
      // Prefer entry-based traversal (preserves folder structure).
      if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === "function") {
        const entries = readEntries(items);
        const files = await collectFilesFromEntries(entries);
        if (files.length > 0) {
          // Synthesize a FileList-like with webkitRelativePath set.
          const annotated = files.map(({ file, path }) => {
            Object.defineProperty(file, "webkitRelativePath", {
              value: path,
              configurable: true,
            });
            return file;
          });
          await processFileList(annotated as unknown as File[], "folder");
          return;
        }
      }
      // Fallback: flat file list.
      if (dt.files && dt.files.length > 0) {
        await processFileList(dt.files, "loose");
        return;
      }
      setError("Nothing to upload was found in the drop.");
    } catch (err: any) {
      setError(err?.message ?? "Could not read dropped items.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop files, a folder, or a .zip here to upload"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={cn(
          "group relative flex min-h-[15rem] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-all",
          "bg-card/40 hover:bg-card/70 hover:border-primary/60",
          dragging &&
            "border-primary bg-primary/5 animate-drop-pulse scale-[1.01]",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform",
            dragging && "scale-110",
          )}
        >
          {busy ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <UploadCloud className="h-7 w-7" />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-base font-semibold">
            {busy ? "Reading files…" : "Drop your project here"}
          </p>
          <p className="text-sm text-muted-foreground">
            Drag a <span className="font-medium text-foreground">.zip</span>, a{" "}
            <span className="font-medium text-foreground">folder</span>, or
            individual files — or browse below.
          </p>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <FolderUp className="mr-1.5 h-4 w-4" /> Browse files
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              folderInputRef.current?.click();
            }}
          >
            <FolderUp className="mr-1.5 h-4 w-4" /> Upload folder
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              zipInputRef.current?.click();
            }}
          >
            <FileArchive className="mr-1.5 h-4 w-4" /> Upload .zip
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Up to 2,000 files · 100 MB total · 25 MB per file
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) processFileList(e.target.files, "loose");
            e.target.value = "";
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error non-standard but widely supported
          webkitdirectory=""
          directory=""
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) processFileList(e.target.files, "folder");
            e.target.value = "";
          }}
        />
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) processZip(f);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ---- FileSystemEntry traversal helpers ----

function readEntries(items: DataTransferItemList): FileSystemEntry[] {
  const out: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind !== "file") continue;
    const entry = it.webkitGetAsEntry?.();
    if (entry) out.push(entry);
  }
  return out;
}

async function collectFilesFromEntries(
  entries: FileSystemEntry[],
): Promise<{ file: File; path: string }[]> {
  const out: { file: File; path: string }[] = [];
  for (const entry of entries) {
    await walkEntry(entry, "", out);
  }
  return out;
}

function walkEntry(
  entry: FileSystemEntry,
  prefix: string,
  out: { file: File; path: string }[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      fileEntry.file(
        (file) => {
          out.push({ file, path });
          resolve();
        },
        (err) => reject(err),
      );
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const all: FileSystemEntry[] = [];
      const readBatch = () => {
        reader.readEntries(
          (batch) => {
            if (batch.length === 0) {
              Promise.all(all.map((c) => walkEntry(c, path, out)))
                .then(() => resolve())
                .catch(reject);
            } else {
              all.push(...batch);
              readBatch();
            }
          },
          (err) => reject(err),
        );
      };
      readBatch();
    } else {
      resolve();
    }
  });
}
