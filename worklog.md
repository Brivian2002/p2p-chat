# DropToGit — Work Log

Project: DropToGit — drag-and-drop tool to push projects to GitHub.
Stack: Next.js 16 App Router, TypeScript, Tailwind v4, shadcn/ui, JSZip, GitHub REST + Git Data API. Stateless, no DB.

---
Task ID: 1
Agent: main
Task: Install JSZip and set up brand theme (charcoal/green/white/blue + dark mode).

Work Log:
- Installed jszip via bun.
- Will rewrite globals.css with brand palette and update layout metadata/favicon.

Stage Summary:
- jszip available.

---
Task ID: 2
Agent: main
Task: Build lib utilities (types, github client, zip/diff/bytes/sse).

Work Log:
- types.ts: shared types (ProjectFile, BlobRef, PushResult, ProgressEvent, StageId, RepoInfo, DiffResult).
- bytes.ts: browser-safe base64<->bytes, formatBytes.
- github.ts (server-only): Git Data API client — verifyToken, listRepos, createRepo, getRef/getCommit/getRecursiveTree, createBlob, createTree, createCommit, updateRef, createRef, getExistingFiles. GitHubError with token-free safeDetail, rate-limit handling.
- zip.ts: sanitizePath (blocks ../, .git, null bytes, absolute), stripCommonRoot, extractZip (JSZip), readFolderFiles (webkitdirectory), readLooseFiles, validateFiles (100MB/2000 files/25MB-per-file), buildTree.
- diff.ts: computeGitBlobShaAsync (SHA-1 via Web Crypto), diffFiles, filesNeedingUpload.
- sse.ts: streamProgress (server) + readProgressStream (client) for SSE.

Stage Summary:
- Stateless, no DB. Token never logged. Path traversal blocked.

---
Task ID: 3
Agent: main
Task: Build API routes + push/wipe orchestration.

Work Log:
- push.ts (server-only): executePush (replace = tree w/o base; smart = tree w/ base, only new+changed blobs), executeWipe (empty-tree commit). Progress callbacks.
- /api/repos (POST list), /api/repos/create (POST), /api/repos/tree (POST existing files for pre-push diff).
- /api/push/blobs (POST, chunked blob creation), /api/push/commit (POST, SSE streaming), /api/wipe (POST, SSE streaming). All runtime=nodejs, maxDuration=300, force-dynamic.

Stage Summary:
- Verified: all routes return 400 on bad input (no 500s). 401 from GitHub maps to friendly error end-to-end.

---
Task ID: 4-6
Agent: main
Task: Logo, components, main page.

Work Log:
- Logo.tsx: custom SVG mark (drop arrow + git commit node + blue branch) + wordmark. droptogit-icon.svg favicon.
- Components: ThemeToggle, CredentialsForm (PAT + show/hide + security note), RepoPicker (searchable combobox + create-repo dialog), Dropzone (drag/folder/zip + FileSystemEntry traversal), FileTreePreview (collapsible tree), UploadStats, ModeSelector (smart/replace cards), DestinationForm, ProgressBar (8 staged), WipeRepoButton (typed-name confirm), SuccessScreen.
- layout.tsx: theme provider, metadata, favicon.
- globals.css: brand palette (charcoal/green/white/blue) + dark mode + utilities (bg-grid, text-gradient-green, scroll-slim, animations).
- page.tsx: full workflow (connect → repo → upload → preview → mode/destination/commit → push → success), pre-push diff preview, chunked upload, SSE progress, wipe, sticky footer.

Stage Summary:
- Complete client+server integration.

---
Task ID: 7
Agent: main
Task: Lint + Agent Browser verification.

Work Log:
- Fixed missing lucide icon (RefreshCwDot -> RefreshCcw) and non-standard Tailwind size (h-4.5 -> h-5).
- Agent Browser: page renders (dark+light), title correct, hero + step cards present.
- Theme toggle works (dark<->light via dropdown).
- Credentials: fake token -> 401 -> friendly error "GitHub rejected the token..." rendered (verified via DOM).
- API routes: all return 400 on bad input (no 500s).
- Sticky footer: gap=0 on tall viewport (content shorter than viewport); natural push on overflow.
- Mobile (390x844): renders correctly, header collapses.
- VLM visual review: "highly professional, modern, production-ready, no critical visual bugs."
- Lint: clean.

Stage Summary:
- App is interactive and runnable. Full push E2E requires a real GitHub PAT (not available in sandbox); GitHub client verified working via 401 path.
