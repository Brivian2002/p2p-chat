'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

interface WipeRepoButtonProps {
  owner: string;
  repoName: string;
  token: string;
  disabled?: boolean;
  onWiped?: () => void;
}

export function WipeRepoButton({ owner, repoName, token, disabled, onWiped }: WipeRepoButtonProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleWipe = async () => {
    if (confirmText !== repoName) {
      setError('Repository name does not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/wipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          owner,
          repo: repoName,
          confirmRepoName: confirmText,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(data.error || 'Failed to delete files');
      }
      onWiped?.();
      resetState();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete files');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep(1);
    setConfirmText('');
    setError('');
  };

  return (
    <AlertDialog
      open={step === 2}
      onOpenChange={(open) => {
        if (!open) resetState();
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          disabled={disabled || !owner || !repoName}
          onClick={() => setStep(2)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete All Files
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete All Files?</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                This will permanently delete <strong>all files</strong> from{' '}
                <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-sm">
                  {owner}/{repoName}
                </code>{' '}
                in a single commit.
              </p>
              <p className="text-destructive font-medium">
                This action cannot be undone.
              </p>
              <div className="pt-2">
                <label className="text-sm font-medium text-foreground">
                  Type{' '}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
                    {repoName}
                  </code>{' '}
                  to confirm:
                </label>
                <Input
                  className="mt-2"
                  placeholder={repoName}
                  value={confirmText}
                  onChange={(e) => {
                    setConfirmText(e.target.value);
                    setError('');
                  }}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleWipe}
            disabled={loading || confirmText !== repoName}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
