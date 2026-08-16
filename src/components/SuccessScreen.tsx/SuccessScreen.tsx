'use client';

import { ExternalLink, ArrowRight, RotateCcw, CheckCircle2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';

interface SuccessScreenProps {
  repoUrl: string;
  commitSha: string;
  commitUrl: string;
  commitMessage: string;
  filesUploaded: number;
  filesChanged: number;
  onPushAnother: () => void;
}

export function SuccessScreen({
  repoUrl,
  commitSha,
  commitUrl,
  commitMessage,
  filesUploaded,
  filesChanged,
  onPushAnother,
}: SuccessScreenProps) {
  const [copied, setCopied] = useState(false);

  const copySha = () => {
    navigator.clipboard.writeText(commitSha);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-bold">Successfully pushed to GitHub!</h3>
          <p className="text-muted-foreground mt-1">
            Your project has been uploaded and committed.
          </p>
        </div>
      </div>

      <Card className="border-primary/20">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Files Uploaded</p>
              <p className="font-semibold text-lg mt-0.5">{filesUploaded}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Files Changed</p>
              <p className="font-semibold text-lg mt-0.5">{filesChanged}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Commit Message</p>
              <p className="text-sm font-medium mt-0.5 line-clamp-2">{commitMessage}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Commit SHA</p>
              <button
                onClick={copySha}
                className="flex items-center gap-1.5 text-sm font-mono mt-0.5 hover:text-primary transition-colors group"
              >
                {commitSha.slice(0, 12)}
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button asChild className="flex-1">
              <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Repository
              </a>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <a href={commitUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Commit
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full"
        onClick={onPushAnother}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Push Another Project
      </Button>
    </div>
  );
}
