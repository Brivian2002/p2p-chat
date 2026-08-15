'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Cloud,
  Code2,
  Eye,
  EyeOff,
  FileCode2,
  GitBranch,
  Github,
  KeyRound,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Upload,
  Wand2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import type { GitHubRepo } from '@/lib/github';
import { uint8ArrayToBase64 } from '@/lib/zip';
import { useAppStore, type PushMode } from '@/store';
import { AnalysisSection } from '@/components/AnalysisSection';
import { CreateRepoDialog } from '@/components/CreateRepoDialog';
import { Dropzone } from '@/components/Dropzone';
import FilePreview from '@/components/FilePreview';
import { FileTreePreview } from '@/components/FileTreePreview';
import { ProgressBar, type ProgressStage } from '@/components/ProgressBar';
import { RepoPicker } from '@/components/RepoPicker';
import { SuccessScreen } from '@/components/SuccessScreen';
import { WipeRepoButton } from '@/components/WipeRepoButton';
import { ZaiLoader } from '@/components/ZaiLoader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: 'easeOut' as const },
};

function StepIcon({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'blue' | 'violet' }) {
  return <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1', tone === 'green' && 'bg-primary/10 text-primary ring-primary/20', tone === 'blue' && 'bg-sky-accent/10 text-sky-accent ring-sky-accent/20', tone === 'violet' && 'bg-violet-400/10 text-violet-300 ring-violet-400/20')}>{children}</div>;
}

function SectionHeader({ step, title, description, icon, tone = 'green' }: { step: string; title: string; description: string; icon: React.ReactNode; tone?: 'green' | 'blue' | 'violet' }) {
  return (
    <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-5">
      <StepIcon tone={tone}>{icon}</StepIcon>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{step}</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-primary/80">Active workspace</span>
        </div>
        <CardTitle className="text-lg tracking-tight">{title}</CardTitle>
        <CardDescription className="mt-1 max-w-2xl leading-6">{description}</CardDescription>
      </div>
    </CardHeader>
  );
}

function WorkflowRail({ tokenReady, repoReady, filesReady, success }: { tokenReady: boolean; repoReady: boolean; filesReady: boolean; success: boolean }) {
  const items = [
    { label: 'Connect', done: tokenReady },
    { label: 'Choose repo', done: repoReady },
    { label: 'Add files', done: filesReady },
    { label: 'Push', done: success },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl border border-border/70 bg-card/50 p-2 sm:p-3">
      {items.map((item, index) => (
        <div key={item.label} className="relative flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 sm:px-3">
          {index < items.length - 1 && <div className={cn('absolute right-[-0.4rem] top-1/2 hidden h-px w-3 -translate-y-1/2 sm:block', item.done ? 'bg-primary/60' : 'bg-border')} />}
          <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold', item.done ? 'border-primary/40 bg-primary text-primary-foreground' : 'border-border bg-muted/50 text-muted-foreground')}>
            {item.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
          </div>
          <span className={cn('hidden truncate text-xs font-medium sm:block', item.done ? 'text-foreground' : 'text-muted-foreground')}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function TrustStrip() {
  return (
    <div className="grid gap-3 border-y border-border/70 py-5 sm:grid-cols-3">
      <div className="flex items-center gap-2.5 text-xs text-muted-foreground"><LockKeyhole className="h-4 w-4 text-primary" /><span><strong className="text-foreground">Session-only</strong><br />credentials</span></div>
      <div className="flex items-center gap-2.5 text-xs text-muted-foreground"><Zap className="h-4 w-4 text-sky-accent" /><span><strong className="text-foreground">Direct to GitHub</strong><br />no middleman</span></div>
      <div className="flex items-center gap-2.5 text-xs text-muted-foreground"><Code2 className="h-4 w-4 text-violet-300" /><span><strong className="text-foreground">Open source</strong><br />built for builders</span></div>
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

  const canShowRepos = store.token.length > 0;
  const canShowUpload = store.selectedRepo !== null;
  const canShowConfigure = store.files.length > 0;
  const selectedFilesForPush = useMemo(() => store.files.filter((file) => store.selectedFilePaths.has(file.path)), [store.files, store.selectedFilePaths]);

  useEffect(() => {
    if (store.files.length > 0 && !store.commitMessage) {
      store.setCommitMessage(`Upload project — ${new Date().toISOString().split('T')[0]}`);
    }
  }, [store.files.length, store.commitMessage, store.setCommitMessage]);

  const fetchBranches = useCallback(async () => {
    if (!store.selectedRepo || !store.token) return;
    setLoadingBranches(true);
    try {
      const [owner, repo] = store.selectedRepo.full_name.split('/');
      const response = await fetch(`/api/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`, { headers: { Authorization: `Bearer ${store.token}` } });
      if (!response.ok) return;
      const data = await response.json();
      const branches = (data.branches || []).map((branch: { name: string }) => branch.name);
      store.setBranches(branches);
      if (branches.length > 0 && !store.branch) store.setBranch(branches[0]);
    } catch {
      // Branch selection remains optional when the GitHub API is unavailable.
    } finally {
      setLoadingBranches(false);
    }
  }, [store.selectedRepo, store.token, store.branch, store.setBranches, store.setBranch]);

  useEffect(() => {
    if (!store.selectedRepo) return;
    const timer = window.setTimeout(() => {
      void fetchBranches();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [store.selectedRepo?.full_name, fetchBranches]);

  const handlePush = useCallback(async () => {
    if (!store.selectedRepo || selectedFilesForPush.length === 0) return;
    const [owner, repo] = store.selectedRepo.full_name.split('/');
    if (!owner || !repo) {
      toast.error('Invalid repository selected');
      return;
    }

    store.setStage('pushing');
    store.setPushError('');
    const filesPayload = selectedFilesForPush.map((file) => ({ path: file.path, content: uint8ArrayToBase64(file.content), size: file.size }));
    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.token}` },
        body: JSON.stringify({ owner, repo, files: filesPayload, commitMessage: store.commitMessage || 'Upload project', mode: store.mode, destination: store.destination.trim(), branch: store.branch || undefined }),
        signal: abortRef.current.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Push failed' }));
        throw new Error(data.error || `Push failed (${response.status})`);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buffer = '';
      const stageMap = new Map<string, number>();
      let stages: ProgressStage[] = [];
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
                stageMap.set(event.stage, stages.length);
                stages = [...stages, { stage: event.stage, message: event.message, current: event.current, total: event.total }];
              } else {
                const next = [...stages];
                next[stageMap.get(event.stage)!] = { stage: event.stage, message: event.message, current: event.current, total: event.total };
                stages = next;
              }
              store.setProgress(stages, stageMap.get(event.stage) || 0);
            } else if (event.type === 'success') {
              store.setProgress(stages, stages.length);
              store.setSuccessData({ commitSha: event.commitSha, commitUrl: event.commitUrl, repoUrl: event.repoUrl, filesUploaded: event.filesUploaded, filesChanged: event.filesChanged, commitMessage: store.commitMessage });
              store.setStage('success');
              toast.success('Project pushed to GitHub');
            } else if (event.type === 'error') {
              store.setPushError(event.error);
              toast.error(event.error);
            }
          } catch {
            // Ignore malformed stream lines and continue consuming progress.
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      store.setPushError(message);
      toast.error(message);
    }
  }, [selectedFilesForPush, store]);

  const handleFilesReady = useCallback((files: typeof store.files, totalSize: number, errors: string[]) => {
    store.setFiles(files, totalSize, errors);
    if (files.length > 0) store.setStage('configure');
  }, [store]);

  const handleRepoCreated = useCallback((repo: GitHubRepo) => {
    store.setRepos([repo, ...store.repos]);
    store.setSelectedRepo(repo);
    toast.success(`Repository ${repo.name} created`);
  }, [store]);

  const handleCreateBranch = useCallback(() => {
    const name = newBranch.trim();
    if (!name) return;
    store.setBranches([...store.branches, name]);
    store.setBranch(name);
    setNewBranch('');
    toast.success(`Branch ${name} is ready`);
  }, [newBranch, store]);

  return (
    <div className="relative overflow-hidden">
      <div className="site-grid pointer-events-none absolute inset-x-0 top-0 h-[34rem] opacity-70" />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
        <section className="grid items-end gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              A calmer way to ship
            </div>
            <h1 className="text-balance max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              From project folder to <span className="bg-gradient-to-r from-primary via-primary to-sky-accent bg-clip-text text-transparent">GitHub.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              DropToGit turns a local folder or z.ai build into a clean GitHub commit. No terminal choreography, no local setup, and no credential storage.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-2"><TerminalSquare className="h-3.5 w-3.5 text-primary" />No CLI required</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-2"><ShieldCheck className="h-3.5 w-3.5 text-sky-accent" />Token stays in session</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08, duration: 0.35 }} className="surface-glow relative overflow-hidden rounded-[1.5rem] border border-border/80 bg-card/72 p-5 sm:p-6">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between border-b border-border/70 pb-4">
                <div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Github className="h-4 w-4" /></div><div><p className="text-sm font-semibold">Project delivery</p><p className="font-mono text-[10px] text-muted-foreground">droptogit / workspace</p></div></div>
                <Badge variant="secondary" className="gap-1.5 rounded-full text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Ready</Badge>
              </div>
              <div className="space-y-3 py-5">
                {[
                  { icon: KeyRound, title: 'Connect securely', copy: 'Use a fine-grained GitHub token' },
                  { icon: Upload, title: 'Add your project', copy: 'Drop a folder, zip, or z.ai session' },
                  { icon: GitBranch, title: 'Create a clean commit', copy: 'Choose the branch and push' },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return <div key={item.title} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/45 p-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.title}</p><p className="truncate text-xs text-muted-foreground">{item.copy}</p></div><span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span></div>;
                })}
              </div>
              <div className="flex items-center justify-between border-t border-border/70 pt-4"><span className="text-xs text-muted-foreground">Built for focused shipping</span><ArrowRight className="h-4 w-4 text-primary" /></div>
            </div>
          </motion.div>
        </section>

        <div className="mt-12"><WorkflowRail tokenReady={canShowRepos} repoReady={canShowUpload} filesReady={canShowConfigure} success={store.stage === 'success'} /></div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              <motion.section {...fadeUp} layout>
                <Card className="surface-glow overflow-hidden border-border/80 bg-card/78">
                  <SectionHeader step="01" title="Connect your GitHub" description="Create a short-lived session with a fine-grained Personal Access Token. DropToGit never stores it." icon={<KeyRound className="h-5 w-5" />} />
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Input type={showToken ? 'text' : 'password'} placeholder="github_pat_…" value={store.token} onChange={(event) => store.setToken(event.target.value.trim())} className="h-12 rounded-xl bg-background/55 pr-11 font-mono text-sm" aria-label="GitHub Personal Access Token" />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setShowToken((value) => !value)} aria-label={showToken ? 'Hide token' : 'Show token'}>{showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/6 p-3.5 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p>Your token is used only for this session and sent directly to the GitHub API over HTTPS. For best security, grant access only to the repository you need.</p></div>
                  </CardContent>
                </Card>
              </motion.section>

              {canShowRepos && (
                <motion.section {...fadeUp} layout>
                  <Card className="overflow-hidden border-border/80 bg-card/78">
                    <SectionHeader step="02" title="Choose a destination" description="Select an existing repository or create a new one in seconds." icon={<Github className="h-5 w-5" />} tone="blue" />
                    <CardContent className="space-y-4">
                      <RepoPicker token={store.token} selectedRepo={store.selectedRepo} onSelect={store.setSelectedRepo} onCreateRepo={() => setCreateRepoOpen(true)} disabled={store.stage === 'pushing'} />
                      {store.selectedRepo && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/35 px-3.5 py-3"><a href={store.selectedRepo.html_url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"><Github className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{store.selectedRepo.full_name}</span><ChevronRight className="h-3 w-3 shrink-0" /></a><WipeRepoButton owner={store.selectedRepo.full_name.split('/')[0]} repoName={store.selectedRepo.name} token={store.token} disabled={store.stage === 'pushing'} onWiped={() => toast.success('Repository files deleted')} /></div>}
                    </CardContent>
                  </Card>
                </motion.section>
              )}

              {canShowUpload && store.stage !== 'success' && (
                <motion.section {...fadeUp} layout>
                  <Card className="overflow-hidden border-border/80 bg-card/78">
                    <SectionHeader step="03" title="Add your project" description="Use local files for a fast upload, or pull a generated project from a z.ai chat session." icon={<Upload className="h-5 w-5" />} />
                    <CardContent>
                      <Tabs defaultValue="local" className="w-full">
                        <TabsList className="mb-5 grid h-11 w-full grid-cols-2 rounded-xl bg-muted/70 p-1"><TabsTrigger value="local" className="rounded-lg text-xs sm:text-sm"><FileCode2 className="h-4 w-4" />Local files</TabsTrigger><TabsTrigger value="zai" className="rounded-lg text-xs sm:text-sm"><Cloud className="h-4 w-4" />z.ai session</TabsTrigger></TabsList>
                        <TabsContent value="local" className="mt-0"><Dropzone onFilesReady={handleFilesReady} isProcessing={store.stage === 'pushing'} /></TabsContent>
                        <TabsContent value="zai" className="mt-0"><div className="mb-4 rounded-xl border border-sky-accent/15 bg-sky-accent/6 p-3.5 text-xs leading-5 text-muted-foreground"><p><strong className="text-foreground">Have a build in z.ai?</strong> Enter the session identifiers for the chat that contains your project files. The files are fetched into this browser session for review before pushing.</p></div><ZaiLoader disabled={store.stage === 'pushing'} /></TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </motion.section>
              )}

              {canShowConfigure && store.stage !== 'success' && (
                <motion.section {...fadeUp} layout><AnalysisSection /></motion.section>
              )}

              {canShowConfigure && store.stage !== 'success' && (
                <motion.section {...fadeUp} layout>
                  <Card className="overflow-hidden border-border/80 bg-card/78">
                    <SectionHeader step="04" title="Review and push" description="Inspect the file tree, choose how the repository should be updated, then create your commit." icon={<Zap className="h-5 w-5" />} tone="violet" />
                    <CardContent className="space-y-6">
                      <div><div className="mb-2 flex items-center justify-between gap-3"><Label>Files in this upload</Label><span className="text-xs text-muted-foreground">Click a file to preview</span></div><FileTreePreview files={store.files} selectable selectedPaths={store.selectedFilePaths} onToggleFile={store.toggleFilePath} onFileClick={store.setPreviewFile} /></div>
                      <Separator />
                      <div className="space-y-2"><Label>Branch</Label><div className="flex flex-col gap-2 sm:flex-row"><select aria-label="Select branch" value={store.branch} onChange={(event) => store.setBranch(event.target.value)} className="h-10 flex-1 rounded-lg border border-input bg-background/55 px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring">{store.branches.length === 0 && <option value="">{loadingBranches ? 'Loading branches…' : 'Default branch'}</option>}{store.branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</select><div className="relative flex-1"><Input placeholder="new-branch-name" value={newBranch} onChange={(event) => setNewBranch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleCreateBranch()} className="h-10 rounded-lg bg-background/55 pr-10 font-mono text-sm" /><button type="button" onClick={handleCreateBranch} disabled={!newBranch.trim()} aria-label="Create new branch" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-primary disabled:opacity-40"><Plus className="h-4 w-4" /></button></div></div></div>
                      <div className="space-y-3"><Label>Push mode</Label><RadioGroup value={store.mode} onValueChange={(value) => store.setMode(value as PushMode)} className="grid gap-3 sm:grid-cols-2"><label htmlFor="mode-replace" className={cn('relative cursor-pointer rounded-xl border p-4 transition-all hover:bg-muted/30', store.mode === 'replace' ? 'border-primary/60 bg-primary/6' : 'border-border/80')}><div className="flex items-start gap-2.5"><RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" /><div><p className="text-sm font-semibold">Replace everything</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Create a clean snapshot and remove repository files not in this upload.</p></div></div></label><label htmlFor="mode-smart" className={cn('relative cursor-pointer rounded-xl border p-4 transition-all hover:bg-muted/30', store.mode === 'smart' ? 'border-sky-accent/60 bg-sky-accent/6' : 'border-border/80')}><div className="flex items-start gap-2.5"><RadioGroupItem value="smart" id="mode-smart" className="mt-0.5" /><div><p className="text-sm font-semibold">Smart update</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Only add or update uploaded files while preserving everything else.</p></div></div></label></RadioGroup></div>
                      {store.mode === 'replace' && <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/8 p-3.5 text-xs leading-5 text-amber-200"><Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-current" /><p><strong>Replace mode is destructive.</strong> Files already in the repository that are not included in this upload will be removed.</p></div>}
                      <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="destination">Destination subfolder <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="destination" placeholder="e.g. apps/web" value={store.destination} onChange={(event) => store.setDestination(event.target.value)} className="h-10 rounded-lg bg-background/55 font-mono text-sm" /></div><div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="commit-msg">Commit message</Label><Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => { store.setCommitMessage(`Upload project — ${new Date().toISOString().split('T')[0]}`); toast.success('Commit message suggested'); }}><Wand2 className="h-3 w-3" />Suggest</Button></div><Textarea id="commit-msg" placeholder="Describe your changes…" value={store.commitMessage} onChange={(event) => store.setCommitMessage(event.target.value)} className="min-h-[82px] resize-y rounded-lg bg-background/55 text-sm" /></div></div>
                      <div className="flex flex-wrap gap-2"><Badge variant="secondary" className="rounded-full text-xs">{selectedFilesForPush.length}/{store.files.length} files selected</Badge><Badge variant="secondary" className="rounded-full text-xs">{store.mode === 'replace' ? 'Replace' : 'Smart update'}</Badge>{store.branch && <Badge variant="secondary" className="gap-1 rounded-full font-mono text-xs"><GitBranch className="h-3 w-3" />{store.branch}</Badge>}{store.destination && <Badge variant="secondary" className="rounded-full font-mono text-xs">→ {store.destination}</Badge>}</div>
                      <Button size="lg" className="h-12 w-full rounded-xl text-base font-semibold shadow-lg shadow-primary/15" onClick={handlePush} disabled={!store.selectedRepo || selectedFilesForPush.length === 0 || !store.commitMessage.trim() || store.stage === 'pushing'}><Upload className="mr-2 h-4.5 w-4.5" />Push {selectedFilesForPush.length} file{selectedFilesForPush.length === 1 ? '' : 's'} to GitHub<ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </CardContent>
                  </Card>
                </motion.section>
              )}

              {store.stage === 'pushing' && <motion.section {...fadeUp} layout><ProgressBar stages={store.progressStages} currentStage={store.currentProgressStage} isComplete={false} error={store.pushError} />{store.pushError && <Button variant="outline" className="mt-4 h-11 w-full rounded-xl" onClick={() => store.setStage('configure')}>Go back and retry</Button>}</motion.section>}

              {store.stage === 'success' && store.successData && <motion.section {...fadeUp} layout><SuccessScreen repoUrl={store.successData.repoUrl} commitSha={store.successData.commitSha} commitUrl={store.successData.commitUrl} commitMessage={store.successData.commitMessage} filesUploaded={store.successData.filesUploaded} filesChanged={store.successData.filesChanged} onPushAnother={() => store.resetPush()} /></motion.section>}
            </AnimatePresence>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <Card className="border-border/80 bg-card/58">
              <CardContent className="p-5"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Why builders use it</p><h2 className="mt-3 text-lg font-semibold tracking-tight">Less setup. More shipping.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Keep your flow in the browser when you are prototyping, collaborating, or moving a generated build into version control.</p><div className="mt-5 space-y-3"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="text-xs leading-5 text-muted-foreground">Folder and zip uploads with a full file-tree preview.</span></div><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="text-xs leading-5 text-muted-foreground">Smart updates when you only want to touch changed files.</span></div><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="text-xs leading-5 text-muted-foreground">Progress streamed as GitHub objects and commits are created.</span></div></div></CardContent>
            </Card>
            <TrustStrip />
          </aside>
        </section>
      </div>

      <FilePreview file={store.previewFile} open={!!store.previewFile} onOpenChange={(open) => { if (!open) store.setPreviewFile(null); }} />
      <CreateRepoDialog open={createRepoOpen} onOpenChange={setCreateRepoOpen} token={store.token} onCreated={handleRepoCreated} />
    </div>
  );
}
