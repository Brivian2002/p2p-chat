'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, GitFork, Plus, Loader2, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { GitHubRepo } from '@/lib/github';

interface RepoPickerProps {
  token: string;
  selectedRepo: GitHubRepo | null;
  onSelect: (repo: GitHubRepo) => void;
  onCreateRepo: () => void;
  disabled?: boolean;
}

export function RepoPicker({
  token,
  selectedRepo,
  onSelect,
  onCreateRepo,
  disabled,
}: RepoPickerProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchRepos = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/repos', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to fetch' }));
        throw new Error(data.error || 'Failed to fetch repositories');
      }
      const data = await res.json();
      setRepos(data.repos || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load repos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchRepos();
  }, [token]);

  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return repos;
    const q = search.toLowerCase();
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
    );
  }, [repos, search]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Repository</label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 justify-between text-left font-normal h-10"
              disabled={disabled || !token || loading}
            >
              {loading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading repositories...
                </span>
              ) : selectedRepo ? (
                <span className="flex items-center gap-2 truncate">
                  <GitFork className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{selectedRepo.full_name}</span>
                  {selectedRepo.private && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                      Private
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {token ? 'Select a repository...' : 'Enter token first'}
                </span>
              )}
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder="Search repositories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto scrollbar-thin p-1">
              {filtered.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {repos.length === 0
                    ? 'No repositories found'
                    : 'No matching repositories'}
                </p>
              )}
              {filtered.map((repo) => (
                <button
                  key={repo.id}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-colors hover:bg-muted/80 ${
                    selectedRepo?.id === repo.id ? 'bg-primary/10 text-primary' : ''
                  }`}
                  onClick={() => {
                    onSelect(repo);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <GitFork className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{repo.name}</p>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {repo.description}
                      </p>
                    )}
                  </div>
                  {selectedRepo?.id === repo.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          className="h-10 shrink-0"
          onClick={onCreateRepo}
          disabled={disabled || !token}
          title="Create new repository"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
