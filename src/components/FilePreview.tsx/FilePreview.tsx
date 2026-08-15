'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  File,
  Image as ImageIcon,
  FileCode,
  FileText,
  X,
  Copy,
  Check,
} from 'lucide-react';

interface FilePreviewProps {
  file: { path: string; content: Uint8Array; size: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function uint8ToBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp',
]);

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java',
  '.c', '.cpp', '.h', '.css', '.scss', '.html', '.json', '.yaml',
  '.yml', '.toml', '.md', '.sh', '.bash', '.sql', '.graphql', '.vue', '.svelte',
]);

function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return '';
  return path.slice(lastDot).toLowerCase();
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.bmp': 'image/bmp',
  };
  return map[ext] || 'image/png';
}

function getLanguageFromExt(ext: string): string {
 const map: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.rs': 'rust',
    '.go': 'go',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.css': 'css',
    '.scss': 'scss',
    '.html': 'html',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.md': 'markdown',
    '.sh': 'bash',
    '.bash': 'bash',
    '.sql': 'sql',
    '.graphql': 'graphql',
    '.vue': 'vue',
    '.svelte': 'svelte',
  };
  return map[ext] || 'text';
}

const KEYWORDS: Record<string, string[]> = {
  typescript: [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for',
    'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this',
    'class', 'extends', 'implements', 'interface', 'type', 'enum', 'export',
    'import', 'from', 'default', 'async', 'await', 'try', 'catch', 'finally',
    'throw', 'typeof', 'instanceof', 'in', 'of', 'void', 'delete', 'yield',
    'readonly', 'private', 'public', 'protected', 'static', 'abstract',
    'as', 'is', 'keyof', 'infer', 'never', 'unknown', 'any', 'string',
    'number', 'boolean', 'true', 'false', 'null', 'undefined', 'super',
    'constructor', 'get', 'set', 'module', 'declare', 'namespace', 'require',
    'satisfies',
  ],
  javascript: [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for',
    'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this',
    'class', 'extends', 'export', 'import', 'from', 'default', 'async',
    'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof',
    'in', 'of', 'void', 'delete', 'yield', 'true', 'false', 'null',
    'undefined', 'super', 'constructor', 'get', 'set', 'static', 'console',
    'debugger', 'with', 'arguments',
  ],
  python: [
    'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break',
    'continue', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise',
    'with', 'yield', 'lambda', 'pass', 'del', 'global', 'nonlocal', 'assert',
    'in', 'not', 'and', 'or', 'is', 'True', 'False', 'None', 'self',
    'async', 'await', 'print', 'range', 'len', 'str', 'int', 'float',
    'list', 'dict', 'set', 'tuple', 'bool', 'type', 'super', 'property',
  ],
  rust: [
    'fn', 'let', 'mut', 'const', 'if', 'else', 'for', 'while', 'loop',
    'match', 'return', 'break', 'continue', 'struct', 'enum', 'impl', 'trait',
    'pub', 'use', 'mod', 'crate', 'self', 'super', 'where', 'type', 'as',
    'in', 'ref', 'move', 'async', 'await', 'unsafe', 'extern', 'static',
    'true', 'false', 'Self', 'dyn', 'Box', 'Vec', 'String', 'Option',
    'Result', 'Some', 'None', 'Ok', 'Err', 'impl', 'macro_rules',
  ],
  go: [
    'func', 'var', 'const', 'type', 'struct', 'interface', 'map', 'chan',
    'go', 'select', 'case', 'default', 'if', 'else', 'for', 'range',
    'switch', 'break', 'continue', 'return', 'package', 'import', 'defer',
    'fallthrough', 'goto', 'nil', 'true', 'false', 'make', 'new', 'len',
    'cap', 'append', 'copy', 'delete', 'close', 'panic', 'recover', 'print',
    'println', 'fmt', 'string', 'int', 'float64', 'bool', 'error', 'byte',
  ],
  java: [
    'public', 'private', 'protected', 'static', 'final', 'abstract', 'class',
    'interface', 'extends', 'implements', 'new', 'return', 'if', 'else',
    'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'default',
    'try', 'catch', 'finally', 'throw', 'throws', 'import', 'package',
    'this', 'super', 'void', 'int', 'long', 'double', 'float', 'boolean',
    'char', 'byte', 'short', 'String', 'null', 'true', 'false', 'instanceof',
    'enum', 'synchronized', 'volatile', 'transient', 'native', 'assert',
  ],
  c: [
    'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
    'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
    'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof',
    'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void',
    'volatile', 'while', 'NULL', 'true', 'false', 'include', 'define',
    'ifdef', 'ifndef', 'endif', 'pragma',
  ],
  cpp: [
    'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
    'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
    'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof',
    'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void',
    'volatile', 'while', 'class', 'namespace', 'template', 'typename',
    'public', 'private', 'protected', 'virtual', 'override', 'new', 'delete',
    'try', 'catch', 'throw', 'using', 'inline', 'explicit', 'operator',
    'nullptr', 'true', 'false', 'bool', 'string', 'include', 'define',
    'ifdef', 'ifndef', 'endif', 'pragma', 'constexpr', 'noexcept',
  ],
  css: [
    'display', 'position', 'width', 'height', 'margin', 'padding', 'border',
    'color', 'background', 'font', 'text', 'align', 'justify', 'flex',
    'grid', 'overflow', 'opacity', 'transform', 'transition', 'animation',
    'important', 'none', 'auto', 'inherit', 'initial', 'unset', 'relative',
    'absolute', 'fixed', 'sticky', 'block', 'inline', 'hidden', 'visible',
    'solid', 'dashed', 'dotted', 'center', 'left', 'right', 'top', 'bottom',
    'hover', 'focus', 'active', 'before', 'after', 'root', 'media', 'keyframes',
  ],
  html: [
    'DOCTYPE', 'html', 'head', 'body', 'div', 'span', 'p', 'a', 'img',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr',
    'td', 'th', 'form', 'input', 'button', 'select', 'option', 'textarea',
    'script', 'style', 'link', 'meta', 'title', 'header', 'footer', 'nav',
    'main', 'section', 'article', 'aside', 'class', 'id', 'src', 'href',
    'type', 'rel', 'charset', 'content', 'name', 'value', 'placeholder',
  ],
  json: ['true', 'false', 'null'],
  yaml: ['true', 'false', 'null', 'yes', 'no', 'on', 'off'],
  toml: ['true', 'false'],
  markdown: [],
  bash: [
    'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done',
    'case', 'esac', 'function', 'return', 'in', 'select', 'until', 'local',
    'export', 'readonly', 'declare', 'typeset', 'unset', 'set', 'shift',
    'exit', 'break', 'continue', 'echo', 'printf', 'read', 'true', 'false',
    'test', 'source', 'alias', 'unalias', 'cd', 'pwd', 'ls', 'mkdir',
    'rm', 'cp', 'mv', 'cat', 'grep', 'sed', 'awk', 'find', 'sort',
  ],
  sql: [
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
    'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'INDEX', 'JOIN',
    'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'NULL',
    'IS', 'IN', 'LIKE', 'BETWEEN', 'ORDER', 'BY', 'GROUP', 'HAVING',
    'LIMIT', 'OFFSET', 'DISTINCT', 'AS', 'COUNT', 'SUM', 'AVG', 'MIN',
    'MAX', 'UNION', 'ALL', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT', 'DEFAULT',
    'CASCADE', 'UNIQUE', 'CHECK', 'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION',
    'TRUE', 'FALSE', 'INTEGER', 'TEXT', 'BOOLEAN', 'REAL', 'BLOB', 'VARCHAR',
  ],
  graphql: [
    'query', 'mutation', 'subscription', 'fragment', 'on', 'type', 'input',
    'interface', 'union', 'scalar', 'enum', 'extend', 'implements', 'null',
    'true', 'false', 'Int', 'Float', 'String', 'Boolean', 'ID', 'schema',
    'directive', 'repeatable', 'default',
  ],
  vue: [],
  svelte: [],
  text: [],
};

interface Span {
  text: string;
  className: string;
}

function highlightLine(line: string, language: string): Span[] {
  const spans: Span[] = [];
  const keywords = KEYWORDS[language] || [];

  // Build a regex that matches: strings, comments, numbers, keywords
  // Order matters — strings and comments should be matched first
  const stringPattern = `("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\x60(?:[^\\x60]|\\\\.)*\x60)`;
  const commentPatterns: Record<string, string> = {
    typescript: '(?://.*)',
    javascript: '(?://.*)',
    java: '(?://.*)',
    cpp: '(?://.*)',
    c: '(?://.*)',
    go: '(?://.*)',
    rust: '(?://.*)',
    python: '(?:#.*)',
    bash: '(?:#.*)',
    sql: '(?:--.*)',
    toml: '(?:#.*)',
    yaml: '(?:#.*)',
    graphql: '(?:#.*)',
    vue: '(?://.*)',
    svelte: '(?://.*)',
    scss: '(?://.*)',
  };
  const commentPattern = commentPatterns[language] || '(?://.*)';
  const numberPattern = '(?:\\b\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?\\b)';

  // Escape keyword boundary
  const escapedKeywords = keywords
    .filter((k) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k))
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const keywordPattern = escapedKeywords.length > 0
    ? `(?:\\b(?:${escapedKeywords.join('|')})\\b)`
    : null;

  let pattern = stringPattern + '|' + commentPattern + '|' + numberPattern;
  if (keywordPattern) {
    pattern += '|' + keywordPattern;
  }

  const regex = new RegExp(pattern, 'gi');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    // Add preceding plain text
    if (match.index > lastIndex) {
      spans.push({ text: line.slice(lastIndex, match.index), className: '' });
    }

    const matched = match[0];

    if (matched.startsWith('//') || matched.startsWith('#') || matched.startsWith('--')) {
      spans.push({ text: matched, className: 'text-muted-foreground' });
    } else if (
      matched.startsWith('"') ||
      matched.startsWith("'") ||
      matched.startsWith('`')
    ) {
      spans.push({ text: matched, className: 'text-green-600 dark:text-green-400' });
    } else if (/^\d/.test(matched)) {
      spans.push({ text: matched, className: 'text-orange-500 dark:text-orange-400' });
    } else {
      // Keyword
      spans.push({ text: matched, className: 'text-sky-600 dark:text-sky-400' });
    }

    lastIndex = regex.lastIndex;
  }

  // Remaining plain text
  if (lastIndex < line.length) {
    spans.push({ text: line.slice(lastIndex), className: '' });
  }

  return spans;
}

function highlightCode(text: string, language: string): Span[][] {
  const lines = text.split('\n');
  return lines.map((line) => highlightLine(line, language));
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function FilePreview({ file, open, onOpenChange }: FilePreviewProps) {
  const [copied, setCopied] = useState(false);

  const decodedContent = useMemo(() => {
    if (!file) return '';
    return new TextDecoder().decode(file.content);
  }, [file]);

  const ext = useMemo(() => {
    if (!file) return '';
    return getFileExtension(file.path);
  }, [file]);

  const fileType = useMemo(() => {
    if (IMAGE_EXTENSIONS.has(ext)) return 'image' as const;
    if (CODE_EXTENSIONS.has(ext)) return 'code' as const;
    return 'text' as const;
  }, [ext]);

  const language = useMemo(() => {
    if (fileType !== 'code') return '';
    return getLanguageFromExt(ext);
  }, [fileType, ext]);

  const fileName = useMemo(() => {
    if (!file) return '';
    const parts = file.path.split('/');
    return parts[parts.length - 1];
  }, [file]);

  const highlightedLines = useMemo(() => {
    if (fileType === 'image') return [];
    if (fileType === 'code') {
      return highlightCode(decodedContent, language);
    }
    // Plain text — each line is a single span with no highlighting
    return decodedContent.split('\n').map((line) => [{ text: line, className: '' }]);
  }, [fileType, decodedContent, language]);

  const imageDataUrl = useMemo(() => {
    if (fileType !== 'image' || !file) return '';
    const base64 = uint8ToBase64(file.content);
    const mime = getMimeType(ext);
    return `data:${mime};base64,${base64}`;
  }, [fileType, file, ext]);

  const handleCopy = useCallback(async () => {
    if (!decodedContent) return;
    try {
      await navigator.clipboard.writeText(decodedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = decodedContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [decodedContent]);

  const fileIcon = useMemo(() => {
    switch (fileType) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'code':
        return <FileCode className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  }, [fileType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b flex flex-row items-center gap-3 space-y-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-muted-foreground shrink-0">{fileIcon}</div>
            <DialogTitle className="text-sm font-medium truncate">
              {fileName || 'No file selected'}
            </DialogTitle>
            {file && (
              <Badge variant="secondary" className="shrink-0 text-xs font-normal">
                {formatFileSize(file.size)}
              </Badge>
            )}
          </div>
          <button
            onClick={handleCopy}
            disabled={!file || fileType === 'image'}
            className="shrink-0 inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Copy file content"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </DialogHeader>

        {file && (
          <div className="p-4">
            {fileType === 'image' ? (
              <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
                <img
                  src={imageDataUrl}
                  alt={fileName || 'Image preview'}
                  className="max-w-full max-h-[65vh] object-contain rounded"
                />
              </div>
            ) : (
              <div className="bg-muted/50 rounded-lg max-h-[70vh] overflow-y-auto scrollbar-thin">
                <pre className="text-sm font-mono p-4 m-0 leading-relaxed">
                  <div className="flex">
                    {/* Line numbers column */}
                    <div className="select-none text-muted-foreground/60 text-right pr-4 border-r border-border shrink-0">
                      {highlightedLines.map((_, i) => (
                        <div key={i} className="leading-relaxed">
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    {/* Code column */}
                    <div className="pl-4 overflow-x-auto">
                      {highlightedLines.map((spans, lineIdx) => (
                        <div key={lineIdx} className="leading-relaxed">
                          {spans.map((span, spanIdx) => (
                            <span key={spanIdx} className={span.className}>
                              {span.text}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </pre>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
