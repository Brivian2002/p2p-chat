"use client";

import * as React from "react";
import {
  ChevronsUpDown,
  Search,
  Plus,
  Lock,
  Globe,
  GitBranch,
  Loader2,
  Check,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty, CommandSeparator } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { createRepoApi } from "@/lib/push-client";
import type { RepoInfo } from "@/lib/types";

interface RepoPickerProps {
  token: string;
  repos: RepoInfo[];
  loading: boolean;
  selected: RepoInfo | null;
  onSelect: (repo: RepoInfo) => void;
  onRefresh: () => void;
  disabled?: boolean;
}

export function RepoPicker({
  token,
  repos,
  loading,
  selected,
  onSelect,
  onRefresh,
  disabled,
}: RepoPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newPrivate, setNewPrivate] = React.useState(true);
  const [newDesc, setNewDesc] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createErr, setCreateErr] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q),
    );
  }, [repos, query]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateErr(null);
    try {
      const repo = await createRepoApi(token, {
        name: newName.trim(),
        private: newPrivate,
        description: newDesc.trim() || undefined,
      });
      onSelect(repo as RepoInfo);
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      onRefresh();
    } catch (e: any) {
      setCreateErr(e?.message ?? "Failed to create repository.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className="h-11 w-full justify-between font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
                repositories…
              </>
            ) : selected ? (
              <span className="flex items-center gap-2 truncate">
                {selected.private ? (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="truncate">{selected.fullName}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                Select a repository…
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="Search repositories…"
                value={query}
                onValueChange={setQuery}
                className="h-9"
              />
            </div>
            <CommandList className="max-h-72">
              <CommandEmpty>
                {repos.length === 0
                  ? "No repositories found."
                  : "No matches."}
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setCreateOpen(true);
                    setOpen(false);
                  }}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create new repository…
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Your repositories">
                {filtered.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={r.fullName}
                    onSelect={() => {
                      onSelect(r);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected?.id === r.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="flex flex-1 items-center gap-2 truncate">
                      {r.private ? (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="truncate">{r.fullName}</span>
                    </span>
                    {r.defaultBranch && (
                      <Badge variant="secondary" className="ml-2 gap-1 font-mono text-[10px]">
                        <GitBranch className="h-2.5 w-2.5" />
                        {r.defaultBranch}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0"
        onClick={onRefresh}
        disabled={disabled || loading}
        aria-label="Refresh repositories"
        title="Refresh"
      >
        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
      </Button>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a new repository</DialogTitle>
            <DialogDescription>
              A fresh repository will be created under your GitHub account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="repo-name">Repository name</Label>
              <Input
                id="repo-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="my-awesome-project"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repo-desc">Description (optional)</Label>
              <Input
                id="repo-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="A short description"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="repo-private">Private</Label>
                <p className="text-xs text-muted-foreground">
                  Only you can see this repository.
                </p>
              </div>
              <Switch
                id="repo-private"
                checked={newPrivate}
                onCheckedChange={setNewPrivate}
              />
            </div>
            {createErr && (
              <p className="text-sm text-destructive">{createErr}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                "Create repository"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
