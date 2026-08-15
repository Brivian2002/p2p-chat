// Project Analyzer — framework detection, file analysis, secret scanning, cleanup suggestions

import type { ProjectFile } from './zip';
import { formatFileSize } from './zip';

// ─── Types ───────────────────────────────────────────────────────────

export interface FrameworkDetection {
  name: string;
  icon: string;
  version?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface FileIssue {
  path: string;
  type: 'large' | 'binary' | 'secret' | 'sensitive' | 'generated';
  severity: 'warning' | 'danger' | 'info';
  message: string;
}

export interface CleanupSuggestion {
  path: string;
  reason: string;
  size: number;
  fileCount: number;
}

export interface AnalysisResult {
  frameworks: FrameworkDetection[];
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  hasGitignore: boolean;
  hasGit: boolean;
  largeFiles: FileIssue[];
  binaryFiles: FileIssue[];
  secrets: FileIssue[];
  sensitiveFiles: FileIssue[];
  generatedDirs: string[];
  cleanupSuggestions: CleanupSuggestion[];
  summary: string;
}

// ─── Framework Detection ─────────────────────────────────────────────

function readTextFile(files: ProjectFile[], path: string): string {
  const f = files.find((file) => file.path === path);
  if (!f || f.content.length === 0) return '';
  try {
    return new TextDecoder().decode(f.content);
  } catch {
    return '';
  }
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getDeps(pkg: Record<string, unknown>): Record<string, string> {
  const all = { ...(pkg.dependencies as Record<string, string>), ...(pkg.devDependencies as Record<string, string>) };
  return all;
}

const FRAMEWORK_PATTERNS: { deps: string[]; name: string; icon: string }[] = [
  { deps: ['next'], name: 'Next.js', icon: '▲' },
  { deps: ['react', 'react-dom'], name: 'React', icon: '⚛' },
  { deps: ['vue'], name: 'Vue', icon: '💚' },
  { deps: ['@angular/core'], name: 'Angular', icon: '🅰' },
  { deps: ['svelte'], name: 'Svelte', icon: '🔥' },
  { deps: ['vite'], name: 'Vite', icon: '⚡' },
  { deps: ['webpack'], name: 'Webpack', icon: '📦' },
  { deps: ['express'], name: 'Express', icon: '🚂' },
  { deps: ['fastapi'], name: 'FastAPI', icon: '⚡' },
  { deps: ['flask'], name: 'Flask', icon: '🧪' },
  { deps: ['django'], name: 'Django', icon: '🎸' },
  { deps: ['rails'], name: 'Ruby on Rails', icon: '💎' },
  { deps: ['spring-boot'], name: 'Spring Boot', icon: '🍃' },
  { deps: ['tailwindcss'], name: 'Tailwind CSS', icon: '🎨' },
  { deps: ['typescript'], name: 'TypeScript', icon: '🔷' },
  { deps: ['python'], name: 'Python', icon: '🐍' },
];

function detectFrameworks(files: ProjectFile[]): FrameworkDetection[] {
  const detected: FrameworkDetection[] = [];

  const pkgJson = readTextFile(files, 'package.json');
  if (pkgJson) {
    const pkg = parseJson(pkgJson);
    if (pkg) {
      const deps = getDeps(pkg);
      for (const fp of FRAMEWORK_PATTERNS) {
        const matched = fp.deps.some((d) => deps[d]);
        if (matched) {
          const version = deps[fp.deps[0]];
          detected.push({
            name: fp.name,
            icon: fp.icon,
            version: version ? version.replace(/^[^\d]/, '') : undefined,
            confidence: 'high',
          });
        }
      }
    }
  }

  const reqTxt = readTextFile(files, 'requirements.txt');
  if (reqTxt) {
    const pyDeps = FRAMEWORK_PATTERNS.filter((fp) =>
      ['FastAPI', 'Flask', 'Django'].includes(fp.name),
    );
    for (const fp of pyDeps) {
      const depName = fp.name.toLowerCase().replace(/\s+/g, '');
      if (reqTxt.toLowerCase().includes(depName)) {
        detected.push({ name: fp.name, icon: fp.icon, confidence: 'medium' });
      }
    }
    if (!detected.find((d) => d.name === 'Python')) {
      detected.push({ name: 'Python', icon: '🐍', confidence: 'high' });
    }
  }

  // File-based detection
  const paths = new Set(files.map((f) => f.path));
  if (paths.has('Gemfile') && !detected.find((d) => d.name === 'Ruby on Rails')) {
    detected.push({ name: 'Ruby', icon: '💎', confidence: 'medium' });
  }
  if (paths.has('pom.xml') || paths.has('build.gradle')) {
    detected.push({ name: 'Java/Maven', icon: '☕', confidence: 'medium' });
  }
  if (paths.has('go.mod')) {
    detected.push({ name: 'Go', icon: '🔵', confidence: 'high' });
  }
  if (paths.has('Cargo.toml')) {
    detected.push({ name: 'Rust', icon: '🦀', confidence: 'high' });
  }

  return detected;
}

// ─── File Analysis ──────────────────────────────────────────────────

const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp',
  '.mp4', '.mp3', '.wav', '.ogg', '.webm', '.avi', '.mov', '.mkv',
  '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.wasm',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.otf', '.ttf', '.woff', '.woff2', '.eot',
  '.sqlite', '.db', '.sqlite3',
]);

function getExtension(path: string): string {
  const last = path.lastIndexOf('.');
  return last >= 0 ? path.slice(last).toLowerCase() : '';
}

function isBinaryFile(file: ProjectFile): boolean {
  if (BINARY_EXTENSIONS.has(getExtension(file.path))) return true;
  if (file.content.length === 0) return false;
  // Check for null bytes in first 8KB
  const sample = file.content.subarray(0, Math.min(8192, file.content.length));
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return true;
  }
  return false;
}

// ─── Secret Scanning ────────────────────────────────────────────────

const SECRET_PATTERNS: { name: string; pattern: RegExp; severity: 'danger' | 'warning' }[] = [
  { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36,}/g, severity: 'danger' },
  { name: 'GitHub OAuth', pattern: /gho_[a-zA-Z0-9]{36,}/g, severity: 'danger' },
  { name: 'GitHub App Token', pattern: /ghs_[a-zA-Z0-9]{36,}/g, severity: 'danger' },
  { name: 'GitHub Refresh Token', pattern: /ghr_[a-zA-Z0-9]{36,}/g, severity: 'danger' },
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'danger' },
  { name: 'AWS Secret Key', pattern: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g, severity: 'danger' },
  { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, severity: 'danger' },
  { name: 'Stripe Secret Key', pattern: /sk_live_[a-zA-Z0-9]{24,}/g, severity: 'danger' },
  { name: 'Stripe Publishable Key', pattern: /pk_live_[a-zA-Z0-9]{24,}/g, severity: 'warning' },
  { name: 'API Key (generic)', pattern: /(?:api[_-]?key|apikey)[\s]*["']?[\s]*([a-zA-Z0-9_-]{20,})/gi, severity: 'warning' },
  { name: 'Database URL', pattern: /(?:mysql|postgres|mongodb|redis|amqp):\/\/[^\s'"<>]+/gi, severity: 'warning' },
  { name: 'JWT Secret', pattern: /JWT_SECRET[\s]*[:=][\s]*["']([^"']+)["']/gi, severity: 'danger' },
  { name: 'SendGrid API Key', pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g, severity: 'danger' },
  { name: 'Twilio API Key', pattern: /SK[0-9a-fA-F]{32}/g, severity: 'warning' },
  { name: 'Heroku API Key', pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, severity: 'warning' },
];

function scanForSecrets(files: ProjectFile[]): FileIssue[] {
  const secrets: FileIssue[] = [];
  // Only scan text files (not images, binaries)
  const textFiles = files.filter((f) => !isBinaryFile(f));

  // Also skip known non-sensitive files
  const skipPaths = new Set([
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock',
    'bun.lockb', 'composer.lock', '.gitignore', '.gitattributes',
    'tsconfig.json', 'jsconfig.json', '.eslintrc', '.prettierrc',
  ]);

  for (const file of textFiles) {
    const fileName = file.path.split('/').pop() || '';
    if (skipPaths.has(fileName)) continue;

    let content = '';
    try {
      content = new TextDecoder().decode(file.content);
    } catch {
      continue;
    }

    // Skip minified files (very long lines)
    if (content.split('\n').some((line) => line.length > 2000)) continue;

    for (const sp of SECRET_PATTERNS) {
      const matches = content.match(sp.pattern);
      if (matches && matches.length > 0) {
        secrets.push({
          path: file.path,
          type: 'secret',
          severity: sp.severity,
          message: `${sp.name} detected — this should not be committed`,
        });
      }
    }
  }

  return secrets;
}

// ─── Cleanup Suggestions ─────────────────────────────────────────────

const DIRS_TO_EXCLUDE = ['node_modules', '.next', 'dist', 'build', '.turbo', '.nuxt', '.output', 'out'];
const FILES_TO_FLAG = ['.env', '.env.local', '.env.production', '.env.development', '.env.staging'];

function getCleanupSuggestions(files: ProjectFile[]): CleanupSuggestion[] {
  const suggestions: CleanupSuggestion[] = [];
  const pathSet = new Set(files.map((f) => f.path));

  for (const dir of DIRS_TO_EXCLUDE) {
    const dirFiles = files.filter((f) => f.path.startsWith(dir + '/') || f.path === dir);
    if (dirFiles.length > 0) {
      const size = dirFiles.reduce((sum, f) => sum + f.size, 0);
      suggestions.push({
        path: dir + '/',
        reason: `Generated build artifact — should not be committed`,
        size,
        fileCount: dirFiles.length,
      });
    }
  }

  for (const envFile of FILES_TO_FLAG) {
    if (pathSet.has(envFile)) {
      const f = files.find((file) => file.path === envFile);
      suggestions.push({
        path: envFile,
        reason: `Environment file — may contain secrets and API keys`,
        size: f?.size || 0,
        fileCount: 1,
      });
    }
  }

  // Flag .DS_Store and __MACOSX
  const dsStoreFiles = files.filter(
    (f) => f.path === '.DS_Store' || f.path.startsWith('__MACOSX/'),
  );
  if (dsStoreFiles.length > 0) {
    const size = dsStoreFiles.reduce((sum, f) => sum + f.size, 0);
    suggestions.push({
      path: '.DS_Store / __MACOSX/',
      reason: `macOS system files — should not be committed`,
      size,
      fileCount: dsStoreFiles.length,
    });
  }

  return suggestions;
}

// ─── Generated Directory Detection ───────────────────────────────────

function detectGeneratedDirs(files: ProjectFile[]): string[] {
  return DIRS_TO_EXCLUDE.filter((dir) =>
    files.some((f) => f.path.startsWith(dir + '/')),
  );
}

// ─── Main Analysis ───────────────────────────────────────────────────

export function analyzeProject(files: ProjectFile[]): AnalysisResult {
  const frameworks = detectFrameworks(files);

  const totalFolders = new Set(
    files.map((f) => {
      const parts = f.path.split('/');
      return parts.length > 1 ? parts.slice(0, -1).join('/') : null;
    }).filter(Boolean),
  ).size;

  const largeFiles: FileIssue[] = files
    .filter((f) => f.size > LARGE_FILE_THRESHOLD)
    .map((f) => ({
      path: f.path,
      type: 'large' as const,
      severity: 'warning' as const,
      message: `Large file (${formatFileSize(f.size)}) — may slow down the push`,
    }));

  const binaryFileList = files.filter(isBinaryFile);
  const binaryFiles: FileIssue[] = binaryFileList.map((f) => ({
    path: f.path,
    type: 'binary' as const,
    severity: 'info' as const,
    message: `Binary file (${formatFileSize(f.size)})`,
  }));

  const secrets = scanForSecrets(files);

  const sensitiveFiles: FileIssue[] = [];
  for (const file of files) {
    const name = file.path.split('/').pop()?.toLowerCase() || '';
    if (
      name.endsWith('.pem') ||
      name.endsWith('.key') ||
      name === 'id_rsa' ||
      name === 'id_ed25519' ||
      name.endsWith('.p12') ||
      name.endsWith('.pfx')
    ) {
      sensitiveFiles.push({
        path: file.path,
        type: 'sensitive' as const,
        severity: 'danger' as const,
        message: `Sensitive file (private key or certificate) — should not be committed`,
      });
    }
  }

  const cleanupSuggestions = getCleanupSuggestions(files);
  const generatedDirs = detectGeneratedDirs(files);

  const pathSet = new Set(files.map((f) => f.path));
  const hasGitignore = pathSet.has('.gitignore');
  const hasGit = pathSet.has('.git') || files.some((f) => f.path.startsWith('.git/'));

  // Build summary
  const parts: string[] = [];
  if (frameworks.length > 0) {
    parts.push(`${frameworks.map((f) => f.name).join(' + ')} project detected`);
  }
  parts.push(`${files.length} files, ${totalFolders} folders`);
  if (secrets.length > 0) {
    parts.push(`⚠ ${secrets.length} potential secret${secrets.length > 1 ? 's' : ''} found`);
  }
  if (cleanupSuggestions.length > 0) {
    parts.push(`🧹 ${cleanupSuggestions.length} cleanup suggestion${cleanupSuggestions.length > 1 ? 's' : ''}`);
  }

  return {
    frameworks,
    totalFiles: files.length,
    totalFolders,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    hasGitignore,
    hasGit,
    largeFiles,
    binaryFiles,
    secrets,
    sensitiveFiles,
    generatedDirs,
    cleanupSuggestions,
    summary: parts.join(' · '),
  };
}

// ─── Auto-exclude Logic ──────────────────────────────────────────────

export function getAutoExcludePaths(suggestions: CleanupSuggestion[]): Set<string> {
  const excluded = new Set<string>();
  for (const s of suggestions) {
    excluded.add(s.path);
  }
  return excluded;
}

export function filterFiles(
  files: ProjectFile[],
  excludedPaths: Set<string>,
): ProjectFile[] {
  return files.filter((f) => {
    for (const excl of excludedPaths) {
      if (f.path === excl || f.path.startsWith(excl)) return false;
    }
    return true;
  });
}

// ─── Commit Message Suggestions ───────────────────────────────────────

export function suggestCommitMessage(
  analysis: AnalysisResult,
  mode: 'replace' | 'smart',
): string {
  const parts: string[] = [];

  if (mode === 'replace') {
    parts.push('Upload project');
  } else {
    parts.push('Update project');
  }

  if (analysis.frameworks.length > 0) {
    parts.push(`(${analysis.frameworks[0].name})`);
  }

  return parts.join(' ');
}
