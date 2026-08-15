'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import type { GitHubRepo } from '@/lib/github';

interface CreateRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onCreated: (repo: GitHubRepo) => void;
}

export function CreateRepoDialog({
  open,
  onOpenChange,
  token,
  onCreated,
}: CreateRepoDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Repository name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          isPrivate,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to create' }));
        throw new Error(data.error || 'Failed to create repository');
      }
      const data = await res.json();
      onCreated(data.repo);
      onOpenChange(false);
      setName('');
      setDescription('');
      setIsPrivate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Repository</DialogTitle>
          <DialogDescription>
            Create a new GitHub repository to push your project to.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="repo-name">Name *</Label>
            <Input
              id="repo-name"
              placeholder="my-awesome-project"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '-'))}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repo-desc">Description</Label>
            <Input
              id="repo-desc"
              placeholder="A short description of your project"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="repo-private">Private repository</Label>
            <Switch
              id="repo-private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Repository
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
