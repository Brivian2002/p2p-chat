'use client';

import { useState, useCallback } from 'react';
import {
  CloudDownload,
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  User,
  MessageSquare,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import type { ProjectFile } from '@/lib/zip';

export function ZaiLoader({ disabled }: { disabled?: boolean }) {
  const setFiles = useAppStore((s) => s.setFiles);
  const setStage = useAppStore((s) => s.setStage);

  const [userId, setUserId] = useState('');
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastCount, setLastCount] = useState(0);

  const handleFetch = useCallback(async () => {
    if (!userId.trim() || !chatId.trim()) {
      toast.error('Please enter both your User ID and Chat ID');
      return;
    }

    setLoading(true);
    setError('');
    setLastCount(0);

    try {
      const res = await fetch('/api/zai/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId.trim(),
          chatId: chatId.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to fetch (${res.status})`);
      }

      const files: ProjectFile[] = data.files.map(
        (f: { path: string; content: number[]; size: number }) => ({
          path: f.path,
          content: new Uint8Array(f.content),
          size: f.size,
        }),
      );

      if (files.length === 0) {
        throw new Error('No files were returned from z.ai');
      }

      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      setFiles(files, totalSize, []);
      setLastCount(files.length);
      setStage('configure');
      toast.success(`Loaded ${files.length} files from z.ai`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch from z.ai';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [userId, chatId, setFiles, setStage]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* User ID */}
        <div className="space-y-2">
          <Label htmlFor="zai-user-id" className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            User ID
          </Label>
          <Input
            id="zai-user-id"
            type="text"
            placeholder="e.g., 674e4140-a77d-46ac-a6e4-940577222ff7"
            value={userId}
            onChange={(e) => setUserId(e.target.value.trim())}
            className="font-mono text-sm"
            disabled={disabled || loading}
          />
          <p className="text-xs text-muted-foreground">
            Your z.ai account user ID.
          </p>
        </div>

        {/* Chat ID */}
        <div className="space-y-2">
          <Label htmlFor="zai-chat-id" className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Chat ID
          </Label>
          <Input
            id="zai-chat-id"
            type="text"
            placeholder="e.g., 39c312f1-98ee-47c1-b3c5-aa90555d023e"
            value={chatId}
            onChange={(e) => setChatId(e.target.value.trim())}
            className="font-mono text-sm"
            disabled={disabled || loading}
          />
          <p className="text-xs text-muted-foreground">
            The chat ID from the z.ai session containing the code you want to push.
          </p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 rounded-lg p-3">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Success display */}
      {lastCount > 0 && !error && (
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 rounded-lg p-3">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <p>{lastCount} files loaded — ready to configure and push.</p>
        </div>
      )}

      {/* Fetch button */}
      <Button
        className="w-full h-11 font-semibold"
        onClick={handleFetch}
        disabled={disabled || loading || !userId.trim() || !chatId.trim()}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading files from z.ai…
          </>
        ) : (
          <>
            <CloudDownload className="mr-2 h-4 w-4" />
            Load Code from z.ai
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
