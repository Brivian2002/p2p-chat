'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileArchive, FolderOpen, X, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { parseZipFile, readFolderFiles, formatFileSize } from '@/lib/zip';
import type { ProjectFile } from '@/lib/zip';

interface DropzoneProps {
  onFilesReady: (files: ProjectFile[], totalSize: number, errors: string[]) => void;
  isProcessing: boolean;
}

export function Dropzone({ onFilesReady, isProcessing }: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<{
    fileCount: number;
    totalSize: number;
    sourceName: string;
  } | null>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (result: { files: ProjectFile[]; totalSize: number; errors: string[] }, sourceName: string) => {
      if (result.errors.length > 0) {
        setErrors(result.errors);
      } else {
        setErrors([]);
      }

      if (result.files.length > 0) {
        setPreview({
          fileCount: result.files.length,
          totalSize: result.totalSize,
          sourceName,
        });
        onFilesReady(result.files, result.totalSize, result.errors);
      } else if (result.errors.length > 0) {
        setPreview(null);
        onFilesReady([], 0, result.errors);
      }
    },
    [onFilesReady]
  );

  const handleZipFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.zip')) {
        setErrors(['Only .zip files are supported.']);
        return;
      }
      const result = await parseZipFile(file);
      await processFiles(result, file.name);
    },
    [processFiles]
  );

  const handleFolderUpload = useCallback(
    async (fileList: FileList) => {
      const result = await readFolderFiles(fileList);
      const folderName = Array.from(fileList)[0]?.webkitRelativePath?.split('/')[0] || 'folder';
      await processFiles(result, folderName);
    },
    [processFiles]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (isProcessing) return;

      const items = e.dataTransfer.items;
      if (!items) return;

      // Check for folder
      const entries = Array.from(items);
      const hasFolder = entries.some((item) => {
        if (item.kind !== 'file') return false;
        const entry = item.webkitGetAsEntry?.();
        return Boolean(entry?.isDirectory);
      });

      if (hasFolder) {
        // Collect all files from all dropped folders
        const files: File[] = [];
        for (const item of entries) {
          if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry?.();
            if (entry) {
              const dirFiles = await collectFilesFromEntry(entry, entry.name);
              files.push(...dirFiles);
            }
          }
        }
        if (files.length > 0) {
          const fileList = files as unknown as FileList;
          const result = await readFolderFiles(fileList);
          const folderName = files[0]?.webkitRelativePath?.split('/')[0] || 'folder';
          await processFiles(result, folderName);
        }
        return;
      }

      // Check for zip files
      const files = Array.from(e.dataTransfer.files);
      const zipFile = files.find((f) => f.name.endsWith('.zip'));
      if (zipFile) {
        await handleZipFile(zipFile);
        return;
      }

      if (files.length > 0) {
        setErrors([
          'Please upload a .zip file or a folder. Unsupported file type: ' +
            files.map((f) => f.name).join(', '),
        ]);
      }
    },
    [isProcessing, handleZipFile, processFiles]
  );

  const clearPreview = () => {
    setPreview(null);
    setErrors([]);
    onFilesReady([], 0, []);
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop zone for uploading zip files or folders"
        className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
        } ${preview ? 'border-primary/30 bg-primary/5' : ''} ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !preview && zipInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!preview) zipInputRef.current?.click();
          }
        }}
      >
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await handleZipFile(file);
            e.target.value = '';
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          onChange={async (e) => {
            if (e.target.files) await handleFolderUpload(e.target.files);
            e.target.value = '';
          }}
        />

        {preview ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <FileArchive className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{preview.sourceName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {preview.fileCount} files · {formatFileSize(preview.totalSize)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                clearPreview();
              }}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Upload className={`h-7 w-7 text-muted-foreground transition-colors ${isDragOver ? 'text-primary' : ''}`} />
            </div>
            <div>
              <p className="font-semibold">
                {isDragOver ? 'Drop it here!' : 'Drag & drop your project'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a .zip file or a folder
              </p>
            </div>
            <div className="flex gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  zipInputRef.current?.click();
                }}
              >
                <FileArchive className="mr-1.5 h-3.5 w-3.5" />
                Browse .zip
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
              >
                <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                Browse Folder
              </Button>
            </div>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-2.5 p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            <div className="space-y-1">
              {errors.map((err, i) => (
                <p key={i} className="text-sm text-destructive">
                  {err}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function collectFilesFromEntry(
  entry: FileSystemEntry,
  basePath: string
): Promise<File[]> {
  const files: File[] = [];

  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    // Add webkitRelativePath
    Object.defineProperty(file, 'webkitRelativePath', {
      value: `${basePath}/${file.name}`,
      writable: false,
    });
    files.push(file);
  } else if (entry.isDirectory) {
    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
    const entries = await new Promise<FileSystemEntry[]>((resolve) => {
      const allEntries: FileSystemEntry[] = [];
      const readBatch = () => {
        dirReader.readEntries((batch) => {
          if (batch.length === 0) {
            resolve(allEntries);
          } else {
            allEntries.push(...batch);
            readBatch();
          }
        });
      };
      readBatch();
    });
    for (const childEntry of entries) {
      const childFiles = await collectFilesFromEntry(childEntry, `${basePath}/${childEntry.name}`);
      files.push(...childFiles);
    }
  }

  return files;
}
