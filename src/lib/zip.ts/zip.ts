import JSZip from 'jszip';

export interface ProjectFile {
  path: string;
  content: Uint8Array;
  size: number;
}

export interface ZipResult {
  files: ProjectFile[];
  totalSize: number;
  errors: string[];
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB total
const MAX_FILES = 10000;

function sanitizeFilePath(path: string): string {
  // Normalize path separators
  let clean = path.replace(/\\/g, '/');
  // Remove leading slashes
  clean = clean.replace(/^\/+/g, '');
  // Block path traversal (security — only this is enforced)
  if (clean.includes('..') || clean.includes('\0')) {
    throw new Error(`Path traversal detected: ${path}`);
  }
  return clean;
}

export async function parseZipFile(file: File | Blob): Promise<ZipResult> {
  const errors: string[] = [];
  const files: ProjectFile[] = [];
  let totalSize = 0;

  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const entries = Object.entries(zip.files).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [relativePath, zipEntry] of entries) {
    if (zipEntry.dir) continue;

    const sanitized = sanitizeFilePath(relativePath);
    if (!sanitized) continue;

    if (files.length >= MAX_FILES) {
      errors.push(`Too many files (max ${MAX_FILES}). Stopped at '${relativePath}'.`);
      break;
    }

    const content = await zipEntry.async('uint8array');
    const size = content.length;

    if (size > MAX_FILE_SIZE) {
      errors.push(`File too large: '${sanitized}' (${(size / 1024 / 1024).toFixed(1)}MB, max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      continue;
    }

    totalSize += size;
    if (totalSize > MAX_TOTAL_SIZE) {
      errors.push(`Total size exceeded ${MAX_TOTAL_SIZE / 1024 / 1024}MB. Stopped at '${sanitized}'.`);
      break;
    }

    files.push({ path: sanitized, content, size });
  }

  return { files, totalSize, errors };
}

export function parseFileList(fileList: FileList | File[]): ZipResult {
  const errors: string[] = [];
  const files: ProjectFile[] = [];
  let totalSize = 0;

  const fileArray = Array.from(fileList);

  // Group by relative path (webkitdirectory gives webkitRelativePath)
  const basePath = fileArray[0]?.webkitRelativePath?.split('/').shift() || '';

  for (const file of fileArray) {
    const relativePath = file.webkitRelativePath;
    if (!relativePath) {
      errors.push(`File '${file.name}' has no relative path. Use a folder upload or zip file.`);
      continue;
    }

    const sanitized = sanitizeFilePath(relativePath);
    if (!sanitized) continue;

    if (files.length >= MAX_FILES) {
      errors.push(`Too many files (max ${MAX_FILES}). Stopped at '${relativePath}'.`);
      break;
    }

    const size = file.size;
    if (size > MAX_FILE_SIZE) {
      errors.push(`File too large: '${sanitized}' (${(size / 1024 / 1024).toFixed(1)}MB, max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      continue;
    }

    totalSize += size;
    if (totalSize > MAX_TOTAL_SIZE) {
      errors.push(`Total size exceeded ${MAX_TOTAL_SIZE / 1024 / 1024}MB. Stopped at '${sanitized}'.`);
      break;
    }

    // Read file as Uint8Array synchronously wouldn't work, so we'll handle this differently
    // We store the File object and read it later
    files.push({ path: sanitized, content: new Uint8Array(0), size, _file: file } as ProjectFile & { _file: File });
  }

  return { files, totalSize, errors };
}

// Async version for folder uploads - reads file content
export async function readFolderFiles(fileList: FileList | File[]): Promise<ZipResult> {
  const errors: string[] = [];
  const files: ProjectFile[] = [];
  let totalSize = 0;

  const fileArray = Array.from(fileList);

  for (const file of fileArray) {
    const relativePath = file.webkitRelativePath;
    if (!relativePath) {
      errors.push(`File '${file.name}' has no relative path.`);
      continue;
    }

    const sanitized = sanitizeFilePath(relativePath);
    if (!sanitized) continue;

    if (files.length >= MAX_FILES) {
      errors.push(`Too many files (max ${MAX_FILES}). Stopped at '${relativePath}'.`);
      break;
    }

    const size = file.size;
    if (size > MAX_FILE_SIZE) {
      errors.push(`File too large: '${sanitized}' (${(size / 1024 / 1024).toFixed(1)}MB).`);
      continue;
    }

    totalSize += size;
    if (totalSize > MAX_TOTAL_SIZE) {
      errors.push(`Total size exceeded ${MAX_TOTAL_SIZE / 1024 / 1024}MB.`);
      break;
    }

    const buffer = await file.arrayBuffer();
    files.push({ path: sanitized, content: new Uint8Array(buffer), size });
  }

  return { files, totalSize, errors };
}

export function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
