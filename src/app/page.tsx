"use client";

import * as React from "react";
import {
  Github,
  Rocket,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Zap,
  GitBranch,
  RefreshCw,
  ListTree,
  PackageCheck,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Logo, LogoMark } from "@/components/droptogit/Logo";
import { ThemeToggle } from "@/components/droptogit/ThemeToggle";
import { CredentialsForm } from "@/components/droptogit/CredentialsForm";
import { RepoPicker } from "@/components/droptogit/RepoPicker";
import { Dropzone } from "@/components/droptogit/Dropzone";
import { FileTreePreview } from "@/components/droptogit/FileTreePreview";
import { UploadStats } from "@/components/droptogit/UploadStats";
import { DestinationForm } from "@/components/droptogit/DestinationForm";
import { ModeSelector } from "@/components/droptogit/ModeSelector";
import { ProgressBar } from "@/components/droptogit/ProgressBar";
import { WipeRepoButton } from "@/components/droptogit/WipeRepoButton";
import { SuccessScreen } from "@/components/droptogit/SuccessScreen";
import {
  createBlobsChunked,
  commitPush,
  fetchRepos,
  fetchExistingFiles,
  wipeRepo,
} from "@/lib/push-client";
import { computeGitBlobShaAsync } from "@/lib/diff";
import { applyDestination } from "@/lib/zip";
import type { ProjectFile } from "@/lib/zip";
import type { ProgressEvent, PushMode, PushResult, RepoInfo, StageId } from "@/lib/types";

interface PushState {
  status: "idle" | "pushing" | "done" | "error";
  stage: StageId;
  detail?: string;
  progress?: number;
  error?: string | null;
  result?: PushResult;
}

export default function DropToGitPage() {
  const { toast } = useToast();

  // Credentials
  const [token, setToken] = React.useState("");
  const [connectedLogin, setConnectedLogin] = React.useState<string | null>(null);
  const [repos, setRepos] = React.useState<RepoInfo[]>([]);
  const [reposLoading, setReposLoading] = React.useState(false);
  const [credError, setCredError] = React.useState<string | null>(null);

  // Selection + upload
  const [selectedRepo, setSelectedRepo] = React.useState<RepoInfo | null>(null);
  const [files, setFiles] = React.useState<ProjectFile[]>([]);

  // Push config
  const [mode, setMode] = React.useState<PushMode>("smart");
  const [destination, setDestination] = React.useState("");
  const [commitMessage, setCommitMessage] = React.useState("Update project via DropToGit");

  // Diff preview (smart mode)
  const [localShas, setLocalShas] = React.useState<Map<string, string> | null>(null);
  const [existingFiles, setExistingFiles] = React.useState<{ path: string; sha: string }[] | null>(null);

  // Push / wipe state
  const [pushState, setPushState] = React.useState<PushState>({ status: "idle", stage: "preparing" });
  const [wipeProgress, setWipeProgress] = React.useState<{ stage: StageId; detail?: string; progress?: number } | null>(null);

  const connected = !!connectedLogin;

  // ---- Connect / disconnect ----
  const handleConnect = async () => {
    setCredError(null);
    setReposLoading(true);
    try {
      const data = await fetchRepos(token);
      setConnectedLogin(data.login);
      setRepos(data.repos);
      toast({ title: "Connected to GitHub", description: `Signed in as @${data.login}` });
    } catch (e: any) {
      setCredError(e?.message ?? "Failed to connect.");
    } finally {
      setReposLoading(false);
    }
  };

  const handleDisconnect = () => {
    setConnectedLogin(null);
    setRepos([]);
    setSelectedRepo(null);
    setToken("");
    setFiles([]);
    setExistingFiles(null);
    setLocalShas(null);
    setPushState({ status: "idle", stage: "preparing" });
  };

  const refreshRepos = async () => {
    if (!token) return;
    setReposLoading(true);
    try {
      const data = await fetchRepos(token);
      setRepos(data.repos);
    } catch (e: any) {
      toast({ title: "Refresh failed", description: e?.message, variant: "destructive" });
    } finally {
      setReposLoading(false);
    }
  };

  // ---- Compute local blob SHAs whenever files change ----
  React.useEffect(() => {
    if (files.length === 0) {
      setLocalShas(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const map = new Map<string, string>();
      for (const f of files) {
        const sha = await computeGitBlobShaAsync(f.content);
        if (cancelled) return;
        map.set(f.path, sha);
      }
      if (!cancelled) setLocalShas(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  // ---- Fetch existing files when repo changes ----
  React.useEffect(() => {
    if (!connected || !selectedRepo || !token) {
      setExistingFiles(null);
      return;
    }
    let cancelled = false;
    setExistingFiles(null);
    (async () => {
      try {
        const [owner, repo] = selectedRepo.fullName.split("/");
        const data = await fetchExistingFiles(token, owner, repo, selectedRepo.defaultBranch ?? undefined);
        if (!cancelled) setExistingFiles(data.files);
      } catch {
        if (!cancelled) setExistingFiles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connected, selectedRepo, token]);

  // ---- Derive diff preview (smart mode) ----
  const diffPreview = React.useMemo(() => {
    if (mode !== "smart" || !localShas || !existingFiles) return null;
    const existingByPath = new Map(existingFiles.map((e) => [e.path, e.sha]));
    let added = 0, changed = 0, unchanged = 0;
    for (const f of files) {
      const fullPath = applyDestination(f.path, destination);
      const ex = existingByPath.get(fullPath);
      const sha = localShas.get(f.path);
      if (!ex) added++;
      else if (sha && sha === ex) unchanged++;
      else changed++;
    }
    return { added, changed, unchanged };
  }, [mode, localShas, existingFiles, files, destination]);

  // ---- Push ----
  const canPush =
    connected &&
    !!selectedRepo &&
    files.length > 0 &&
    pushState.status !== "pushing" &&
    !!commitMessage.trim();

  const handlePush = async () => {
    if (!selectedRepo || !token) return;
    const [owner, repo] = selectedRepo.fullName.split("/");

    setPushState({ status: "pushing", stage: "preparing", detail: "Preparing files…", progress: 0.05 });

    try {
      // Stage: extracting (already done — files are in memory)
      setPushState({ status: "pushing", stage: "extracting", detail: `${files.length} files ready`, progress: 0.1 });

      // Decide which files to upload as blobs.
      const filesToUpload: ProjectFile[] = [];
      if (mode === "smart" && localShas && existingFiles) {
        const existingByPath = new Map(existingFiles.map((e) => [e.path, e.sha]));
        for (const f of files) {
          const fullPath = applyDestination(f.path, destination);
          const ex = existingByPath.get(fullPath);
          const sha = localShas.get(f.path);
          if (!ex || sha !== ex) filesToUpload.push(f);
        }
      } else {
        filesToUpload.push(...files);
      }

      // Stage: uploading (chunked blob creation)
      const blobs = await createBlobsChunked(
        { token, owner, repo, files: filesToUpload },
        (e) =>
          setPushState({
            status: "pushing",
            stage: e.stage,
            detail: e.detail,
            progress: e.progress,
          }),
      );

      // Stages comparing → complete are streamed by the server.
      const result = await commitPush(
        {
          token,
          owner,
          repo,
          branch: selectedRepo.defaultBranch ?? undefined,
          mode,
          destination,
          commitMessage: commitMessage.trim(),
          blobs,
        },
        (e) =>
          setPushState({
            status: "pushing",
            stage: e.stage,
            detail: e.detail,
            progress: e.progress,
          }),
      );

      setPushState({ status: "done", stage: "complete", result });
      toast({ title: "Pushed to GitHub!", description: `${result.added + result.changed} file(s) updated.` });
    } catch (e: any) {
      setPushState({
        status: "error",
        stage: "error",
        error: e?.message ?? "Push failed.",
      });
      toast({ title: "Push failed", description: e?.message, variant: "destructive" });
    }
  };

  // ---- Wipe ----
  const handleWipe = async () => {
    if (!selectedRepo || !token) return;
    const [owner, repo] = selectedRepo.fullName.split("/");
    setWipeProgress({ stage: "comparing", detail: "Starting…", progress: 0.1 });
    try {
      const result = await wipeRepo(
        { token, owner, repo, branch: selectedRepo.defaultBranch ?? undefined },
        (e) => setWipeProgress({ stage: e.stage, detail: e.detail, progress: e.progress }),
      );
      setWipeProgress(null);
      setExistingFiles([]);
      toast({
        title: "Repository emptied",
        description: `All files removed from ${result.repoFullName}.`,
      });
    } catch (e: any) {
      setWipeProgress(null);
      toast({ title: "Wipe failed", description: e?.message, variant: "destructive" });
    }
  };

  const resetForAnother = () => {
    setFiles([]);
    setDestination("");
    setCommitMessage("Update project via DropToGit");
    setPushState({ status: "idle", stage: "preparing" });
    setLocalShas(null);
  };

  // ---- Success screen ----
  if (pushState.status === "done" && pushState.result) {
    return (
      <Shell>
        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
            <SuccessScreen result={pushState.result} onPushAnother={resetForAnother} />
          </div>
        </main>
        <Footer />
      </Shell>
    );
  }

  const pushing = pushState.status === "pushing";

  return (
    <Shell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
        <div className="absolute -top-24 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-brand-green/10 blur-3xl" aria-hidden />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <Logo size={44} />
              <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                Drop your project.{" "}
                <span className="text-gradient-green">Push to GitHub.</span> Done.
              </h1>
              <p className="max-w-xl text-muted-foreground">
                A fast, secure drag-and-drop tool for shipping projects straight
                to GitHub — no terminal, no Git commands. Replace everything or
                smart-update only what changed.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="h-3 w-3 text-brand-green" /> Token never stored
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3 text-brand-blue" /> Smart diffing
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <GitBranch className="h-3 w-3 text-brand-green" /> Git Data API
                </Badge>
              </div>
            </div>
            <div className="hidden shrink-0 rounded-2xl border bg-card/60 p-4 shadow-sm sm:block">
              <LogoMark size={84} />
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:py-10">
          {/* Step 1 — Credentials */}
          <StepCard
            step={1}
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Connect to GitHub"
            description="Paste a Personal Access Token to load your repositories."
            done={connected}
          >
            <CredentialsForm
              token={token}
              onTokenChange={setToken}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              connectedLogin={connectedLogin}
              loading={reposLoading}
              error={credError}
            />
          </StepCard>

          {/* Step 2 — Repository */}
          {connected && (
            <StepCard
              step={2}
              icon={<GitBranch className="h-4 w-4" />}
              title="Choose a repository"
              description="Pick an existing repo or create a new one."
              done={!!selectedRepo}
            >
              <RepoPicker
                token={token}
                repos={repos}
                loading={reposLoading}
                selected={selectedRepo}
                onSelect={setSelectedRepo}
                onRefresh={refreshRepos}
              />
              {selectedRepo && (
                <div className="mt-4 flex flex-col gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2 text-sm">
                    <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div>
                      <p className="font-medium text-foreground">Danger zone</p>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete every file in this repository with a
                        single empty commit.
                      </p>
                    </div>
                  </div>
                  <WipeRepoButton
                    repoFullName={selectedRepo.fullName}
                    repoName={selectedRepo.name}
                    wiping={!!wipeProgress}
                    onConfirm={handleWipe}
                  />
                </div>
              )}
              {wipeProgress && (
                <div className="mt-4">
                  <ProgressBar
                    stage={wipeProgress.stage}
                    detail={wipeProgress.detail}
                    progress={wipeProgress.progress}
                  />
                </div>
              )}
            </StepCard>
          )}

          {/* Step 3 — Upload */}
          {connected && selectedRepo && (
            <StepCard
              step={3}
              icon={<Rocket className="h-4 w-4" />}
              title="Upload your project"
              description="Drag a .zip, a folder, or individual files."
              done={files.length > 0}
            >
              {files.length === 0 ? (
                <Dropzone onFiles={setFiles} />
              ) : (
                <div className="space-y-4">
                  <UploadStats files={files} />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <ListTree className="h-4 w-4 text-brand-blue" />
                        Project structure
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFiles([])}
                        className="h-7 text-xs"
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear
                      </Button>
                    </div>
                    <FileTreePreview files={files} />
                  </div>
                </div>
              )}
            </StepCard>
          )}

          {/* Step 4 — Configure & push */}
          {connected && selectedRepo && files.length > 0 && (
            <StepCard
              step={4}
              icon={<PackageCheck className="h-4 w-4" />}
              title="Configure & push"
              description="Choose how to push, where to, and commit message."
            >
              <div className="space-y-5">
                <ModeSelector
                  value={mode}
                  onChange={setMode}
                  diff={diffPreview}
                  disabled={pushing}
                />
                <DestinationForm
                  value={destination}
                  onChange={setDestination}
                  disabled={pushing}
                />
                <div className="space-y-2">
                  <Label htmlFor="commit-msg">Commit message</Label>
                  <Textarea
                    id="commit-msg"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    disabled={pushing}
                    rows={2}
                    className="resize-none"
                    placeholder="Update project via DropToGit"
                  />
                </div>

                {pushing || pushState.status === "error" ? (
                  <div className="rounded-xl border bg-card/60 p-4">
                    <ProgressBar
                      stage={pushState.stage}
                      detail={pushState.detail}
                      progress={pushState.progress}
                      error={pushState.error}
                    />
                    {pushState.status === "error" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() =>
                          setPushState({ status: "idle", stage: "preparing" })
                        }
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="w-full gap-2 text-base"
                    onClick={handlePush}
                    disabled={!canPush}
                  >
                    <Rocket className="h-5 w-5" />
                    Push to GitHub
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}

                {mode === "replace" && (
                  <p className="flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <Trash2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Replace Everything will remove all files currently in the
                    repository that aren’t part of this upload. This happens in a
                    single clean commit.
                  </p>
                )}
              </div>
            </StepCard>
          )}
        </div>
      </main>

      <Footer />
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Layout shell + small helpers
// ---------------------------------------------------------------------------

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <a href="/" className="flex items-center" aria-label="DropToGit home">
            <LogoMark size={30} />
            <span className="ml-2 text-base font-bold tracking-tight">
              Drop<span className="text-gradient-green">ToGit</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
              <a
                href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-1.5 h-4 w-4" /> Get a token
              </a>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t bg-background/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span>
            <strong className="text-foreground">DropToGit</strong> — stateless,
            secure, no tracking.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-brand-green" /> Token never
            stored
          </span>
          <span className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3 text-brand-blue" /> Built on Git Data
            API
          </span>
        </div>
      </div>
    </footer>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
  done,
  children,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="animate-float-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60 text-sm font-semibold">
            {done ? (
              <PackageCheck className="h-4 w-4 text-brand-green" />
            ) : (
              step
            )}
          </div>
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-1.5 text-base">
              {icon}
              {title}
            </CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
