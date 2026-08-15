'use client';

import { useRef, useState, useCallback } from 'react';
import { RepoPicker } from '@/components/RepoPicker';
import { CreateRepoDialog } from '@/components/CreateRepoDialog';
import { Dropzone } from '@/components/Dropzone';
import { FileTreePreview } from '@/components/FileTreePreview';
import { ProgressBar, type ProgressStage } from '@/components/ProgressBar';
import { WipeRepoButton } from '@/components/WipeRepoButton';
import { SuccessScreen } from '@/components/SuccessScreen';
import { AnalysisSection } from '@/components/AnalysisSection';
import FilePreview from '@/components/FilePreview';
import { useAppStore, type PushMode } from '@/store';
import { uint8ArrayToBase64 } from '@/lib/zip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight,
  Upload,
  GitBranch,
  Shield,
  Zap,
  Github,
  Plus,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { GitHubRepo } from '@/lib/github';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: 'easeOut' },
};

// ─── Step Icon Wrapper ──────────────────────────────────────────

function StepIcon({ children, color = 'primary' }: { children: React.ReactNode; color?: 'primary' | 'accent' }) {
  return (
    <div className={cn(
      'flex h-10 w-10 items-center justify-center rounded-xl shadow-sm',
      color === 'primary'
        ? 'bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20'
        : 'bg-gradient-to-br from-sky-accent/20 to-sky-accent/5 ring-1 ring-sky-accent/20',
    )}>
      {children}
    </div>
  );
}

export default function Home() {
  const store = useAppStore();
  const [showToken, setShowToken] = useState(false);
  const [createRepoOpen, setCreateRepoOpen] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [newBranch, setNewBranch] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  // Auto-generate commit message
  if (store.files.length > 0 && !store.commitMessage) {
    const date = new Date().toISOString().split('T')[0];
    store.setCommitMessage(`Upload project - ${date}`);
  }

  const canShowRepos = store.token.length > 0;
  const canShowUpload = store.selectedRepo !== null;
  const canShowConfigure = store.files.length > 0;
  const selectedFilesForPush = store.files.filter((f) =>
    store.selectedFilePaths.has(f.path),
  );

  // Fetch branches when repo is selected
  const fetchBranches = useCallback(async () => {
    if (!store.selectedRepo || !store.token) return;
    setLoadingBranches(true);
    try {
      const [owner, repo] = store.selectedRepo.full_name.split('/');
      const res = await fetch(
        `/api/branches?owner=${owner}&repo=${repo}`,
        { headers: { Authorization: `Bearer ${store.token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        const branches = (data.branches || []).map((b: { name: string }) => b.name);
        store.setBranches(branches);
        if (branches.length > 0 && !store.branch) {
          store.setBranch(branches[0]);
        }
      }
    } catch {
      // Silent fail — branches are optional
    } finally {
      setLoadingBranches(false);
    }
  }, [store.selectedRepo, store.token, store.branch, store.setBranches, store.setBranch]);

  // Watch for repo selection to load branches
  const prevRepoRef = useRef<string>('');
  if (store.selectedRepo?.full_name !== prevRepoRef.current) {
    prevRepoRef.current = store.selectedRepo?.full_name || '';
    if (store.selectedRepo) fetchBranches();
  }

  const handlePush = useCallback(async () => {
    if (!store.selectedRepo || selectedFilesForPush.length === 0) return;

    const [owner, repo] = store.selectedRepo.full_name.split('/');
    if (!owner || !repo) { toast.error('Invalid repository selected'); return; }

    store.setStage('pushing');
    store.setPushError('');

    const filesPayload = selectedFilesForPush.map((f) => ({
      path: f.path,
      content: uint8ArrayToBase64(f.content),
      size: f.size,
    }));

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.token}` },
        body: JSON.stringify({
          owner, repo,
          files: filesPayload,
          commitMessage: store.commitMessage || 'Upload project',
          mode: store.mode,
          destination: store.destination.trim(),
          branch: store.branch || undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Push failed' }));
        throw new Error(data.error || `Push failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      const stageMap = new Map<string, number>();
      let stageList: ProgressStage[] = [];
      let currentIdx = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'progress') {
              if (!stageMap.has(event.stage)) {
                stageMap.set(event.stage, stageList.length);
                stageList.push({ stage: event.stage, message: event.message, current: event.current, total: event.total });
              } else {
                const idx = stageMap.get(event.stage)!;
                stageList[idx] = { stage: event.stage, message: event.message, current: event.current, total: event.total };
              }
              currentIdx = stageMap.get(event.stage) || 0;
              store.setProgress(stageList, currentIdx);
            } else if (event.type === 'success') {
              store.setProgress(stageList, stageList.length);
              store.setSuccessData({
                commitSha: event.commitSha, commitUrl: event.commitUrl,
                repoUrl: event.repoUrl, filesUploaded: event.filesUploaded,
                filesChanged: event.filesChanged, commitMessage: store.commitMessage,
              });
              store.setStage('success');
              toast.success('Successfully pushed to GitHub!');
            } else if (event.type === 'error') {
              store.setPushError(event.error);
              toast.error(event.error);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'An unexpected error occurred';
      store.setPushError(msg);
      toast.error(msg);
    }
  }, [store, selectedFilesForPush]);

  const handleFilesReady = useCallback(
    (files: typeof store.files, totalSize: number, errors: string[]) => {
      store.setFiles(files, totalSize, errors);
      if (files.length > 0) store.setStage('configure');
    },
    [store],
  );

  const handleRepoCreated = useCallback(
    (repo: GitHubRepo) => {
      store.setRepos([repo, ...store.repos]);
      store.setSelectedRepo(repo);
      toast.success(`Repository ${repo.name} created!`);
    },
    [store],
  );

  const handleCreateBranch = useCallback(async () => {
    if (!newBranch.trim()) return;
    const name = newBranch.trim();
    store.setBranches([...store.branches, name]);
    store.setBranch(name);
    setNewBranch('');
    toast.success(`Will push to new branch: ${name}`);
  }, [newBranch, store]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* ─── Hero ──────────────────────────────────────────── */}
      <motion.div
        className="text-center space-y-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
          <Zap className="h-3.5 w-3.5" />
          Free &amp; Open Source
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Drop your project.{' '}
          <span className="bg-gradient-to-r from-primary to-sky-accent bg-clip-text text-transparent">Push</span>{' '}
          it to GitHub.
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
          Upload projects directly to GitHub without the terminal.
          No Git commands. No CLI. Just drag, drop, and push.
        </p>
      </motion.div>

      <div className="space-y-6">
        {/* ─── Step 1: GitHub Token ──────────────────────── */}
        <motion.section {...fadeUp} layout>
          <Card className="overflow-hidden ring-1 ring-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <StepIcon><KeyRound className="h-5 w-5 text-primary" /></StepIcon>
                <div>
                  <CardTitle className="text-base">GitHub Personal Access Token</CardTitle>
                  <CardDescription>Required to authenticate with the GitHub API.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={store.token}
                  onChange={(e) => store.setToken(e.target.value.trim())}
                  className="pr-10 font-mono text-sm"
                  aria-label="GitHub Personal Access Token"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowToken(!showToken)}
                  aria-label={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                <p>
                  Your token is used <strong>only for this session</strong> and is never stored,
                  logged, or shared. It is sent directly to the GitHub API over HTTPS.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* ─── Step 2: Repository ──────────────────────── */}
        <AnimatePresence>
          {canShowRepos && (
            <motion.section {...fadeUp} layout>
              <Card className="overflow-hidden ring-1 ring-border/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <StepIcon color="accent"><GitBranch className="h-5 w-5 text-sky-accent" /></StepIcon>
                    <div>
                      <CardTitle className="text-base">Repository</CardTitle>
                      <CardDescription>Select or create a repository to push to.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <RepoPicker
                    token={store.token}
                    selectedRepo={store.selectedRepo}
                    onSelect={store.setSelectedRepo}
                    onCreateRepo={() => setCreateRepoOpen(true)}
                    disabled={store.stage === 'pushing'}
                  />
                  {store.selectedRepo && (
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-xs text-muted-foreground">
                        <Github className="inline h-3 w-3 mr-1" />
                        <a href={store.selectedRepo.html_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {store.selectedRepo.full_name}
                        </a>
                      </p>
                      <WipeRepoButton
                        owner={store.selectedRepo.full_name.split('/')[0]}
                        repoName={store.selectedRepo.name}
                        token={store.token}
                        disabled={store.stage === 'pushing'}
                        onWiped={() => toast.success('All files deleted successfully')}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ─── Step 3: Upload ────────────────────── */}
        <AnimatePresence>
          {canShowUpload && store.stage !== 'success' && (
            <motion.section {...fadeUp} layout>
              <Card className="overflow-hidden ring-1 ring-border/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <StepIcon><Upload className="h-5 w-5 text-primary" /></StepIcon>
                    <div>
                      <CardTitle className="text-base">Upload Project</CardTitle>
                      <CardDescription>Drag &amp; drop a .zip file or folder.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Dropzone onFilesReady={handleFilesReady} isProcessing={store.stage === 'pushing'} />
                </CardContent>
              </Card>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ─── Step 3.5: Analysis ──────────────────────── */}
        <AnimatePresence>
          {canShowConfigure && store.stage !== 'success' && (
            <motion.section {...fadeUp} layout>
              <AnalysisSection />
            </motion.section>
          )}
        </AnimatePresence>

        {/* ─── Step 4: Configure & Push ─────────────────── */}
        <AnimatePresence>
          {canShowConfigure && store.stage !== 'success' && (
            <motion.section {...fadeUp} layout>
              <Card className="overflow-hidden ring-1 ring-border/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <StepIcon color="accent"><Zap className="h-5 w-5 text-sky-accent" /></StepIcon>
                    <div>
                      <CardTitle className="text-base">Configure &amp; Push</CardTitle>
                      <CardDescription>Review your files and push to GitHub.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* File Tree with checkboxes */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Files Preview <span className="text-muted-foreground font-normal">(click a file to preview)</span></label>
                    <FileTreePreview
                      files={store.files}
                      selectable
                      selectedPaths={store.selectedFilePaths}
                      onToggleFile={store.toggleFilePath}
                      onFileClick={store.setPreviewFile}
                    />
                  </div>

                  <Separator />

                  {/* Branch Selector */}
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <div className="flex gap-2">
                      <Select value={store.branch} onValueChange={store.setBranch}>
                        <SelectTrigger className="flex-1 font-mono text-sm">
                          <SelectValue placeholder={loadingBranches ? 'Loading…' : 'Select branch'} />
                        </SelectTrigger>
                        <SelectContent>
                          {store.branches.map((b) => (
                            <SelectItem key={b} value={b} className="font-mono">{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Input
                          placeholder="new-branch-name"
                          value={newBranch}
                          onChange={(e) => setNewBranch(e.target.value)}
                          className="font-mono text-sm pr-9"
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                          onClick={handleCreateBranch}
                          disabled={!newBranch.trim()}
                          aria-label="Create new branch"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Push Mode */}
                  <div className="space-y-3">
                    <Label>Push Mode</Label>
                    <RadioGroup
                      value={store.mode}
                      onValueChange={(v) => store.setMode(v as PushMode)}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      <label
                        htmlFor="mode-replace"
                        className={cn(
                          'relative flex cursor-pointer flex-col rounded-xl border-2 p-4 transition-all hover:bg-muted/30',
                          store.mode === 'replace' ? 'border-primary bg-primary/5 shadow-sm shadow-primary/5' : 'border-border',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">Replace Everything</p>
                            <p className="text-xs text-muted-foreground">
                              Completely replace the repository contents. Old files will be removed in a single clean commit.
                            </p>
                          </div>
                        </div>
                        {store.mode === 'replace' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-b-xl" />
                        )}
                      </label>
                      <label
                        htmlFor="mode-smart"
                        className={cn(
                          'relative flex cursor-pointer flex-col rounded-xl border-2 p-4 transition-all hover:bg-muted/30',
                          store.mode === 'smart' ? 'border-sky-accent bg-sky-accent/5 shadow-sm shadow-sky-accent/5' : 'border-border',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <RadioGroupItem value="smart" id="mode-smart" className="mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">Smart Update</p>
                            <p className="text-xs text-muted-foreground">Only upload new and changed files. Existing files are preserved.</p>
                          </div>
                        </div>
                        {store.mode === 'smart' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-x-0 bottom-0 h-0.5 bg-sky-accent rounded-b-xl" />
                        )}
                      </label>
                    </RadioGroup>
                  </div>

                  {store.mode === 'replace' && (
                    <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg p-3">
                      <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <p><strong>Destructive action:</strong> This will remove all existing files in the repository that are not in your upload. Make sure you have a backup if needed.</p>
                    </div>
                  )}

                  {/* Destination Path */}
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination Subfolder (optional)</Label>
                    <Input
                      id="destination"
                      placeholder="e.g., src/project — leave empty for root"
                      value={store.destination}
                      onChange={(e) => store.setDestination(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Commit Message */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="commit-msg">Commit Message</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs gap-1 px-2"
                        onClick={() => {
                          const date = new Date().toISOString().split('T')[0];
                          store.setCommitMessage(`Upload project - ${date}`);
                          toast.success('Suggested a commit message');
                        }}
                      >
                        <Wand2 className="h-3 w-3" />
                        Suggest
                      </Button>
                    </div>
                    <Textarea
                      id="commit-msg"
                      placeholder="Describe your changes..."
                      value={store.commitMessage}
                      onChange={(e) => store.setCommitMessage(e.target.value)}
                      className="min-h-[80px] resize-y text-sm"
                    />
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {selectedFilesForPush.length}/{store.files.length} files selected
                    </Badge>
                    <Badge variant="secondary" className="text-xs">{store.mode === 'replace' ? 'Replace' : 'Smart Update'}</Badge>
                    {store.branch && (
                      <Badge variant="secondary" className="text-xs font-mono">
                        <GitBranch className="mr-1 h-3 w-3" />{store.branch}
                      </Badge>
                    )}
                    {store.destination && (
                      <Badge variant="secondary" className="text-xs font-mono">→ {store.destination}</Badge>
                    )}
                  </div>

                  {/* Push Button */}
                  <Button
                    size="lg"
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
                    onClick={handlePush}
                    disabled={
                      !store.selectedRepo ||
                      selectedFilesForPush.length === 0 ||
                      !store.commitMessage.trim() ||
                      store.stage === 'pushing'
                    }
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Push {selectedFilesForPush.length} File{selectedFilesForPush.length !== 1 ? 's' : ''} to GitHub
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ─── Step 5: Progress ──────────────────────── */}
        <AnimatePresence>
          {store.stage === 'pushing' && (
            <motion.section {...fadeUp} layout>
              <ProgressBar
                stages={store.progressStages}
                currentStage={store.currentProgressStage}
                isComplete={false}
                error={store.pushError}
              />
              {store.pushError && (
                <Button variant="outline" className="w-full mt-4" onClick={() => store.setStage('configure')}>
                  Go Back and Retry
                </Button>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ─── Step 6: Success ──────────────────────── */}
        <AnimatePresence>
          {store.stage === 'success' && store.successData && (
            <motion.section {...fadeUp} layout>
              <SuccessScreen
                repoUrl={store.successData.repoUrl}
                commitSha={store.successData.commitSha}
                commitUrl={store.successData.commitUrl}
                commitMessage={store.successData.commitMessage}
                filesUploaded={store.successData.filesUploaded}
                filesChanged={store.successData.filesChanged}
                onPushAnother={() => store.resetPush()}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* File Preview Dialog */}
      <FilePreview
        file={store.previewFile}
        open={!!store.previewFile}
        onOpenChange={(open) => { if (!open) store.setPreviewFile(null); }}
      />

      {/* Create Repo Dialog */}
      <CreateRepoDialog
        open={createRepoOpen}
        onOpenChange={setCreateRepoOpen}
        token={store.token}
        onCreated={handleRepoCreated}
      />
    </div>
  );
}
