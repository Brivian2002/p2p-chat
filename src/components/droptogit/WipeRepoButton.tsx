"use client";

import * as React from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface WipeRepoButtonProps {
  repoFullName: string;
  repoName: string;
  disabled?: boolean;
  wiping?: boolean;
  onConfirm: () => void;
}

export function WipeRepoButton({
  repoFullName,
  repoName,
  disabled,
  wiping,
  onConfirm,
}: WipeRepoButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");

  const matches = typed.trim() === repoName;

  React.useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || wiping}
          className={cn(
            "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive",
          )}
        >
          {wiping ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          {wiping ? "Deleting…" : "Delete all files"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete all files in this repository?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                This will <strong>permanently remove every file</strong> in{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                  {repoFullName}
                </code>{" "}
                by creating a single empty-tree commit on the default branch.
                This cannot be undone.
              </p>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-foreground">
                <p className="font-medium">To confirm, type the repository name:</p>
                <p className="mt-1 font-mono text-sm text-destructive">{repoName}</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-repo">Repository name</Label>
          <Input
            id="confirm-repo"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={repoName}
            autoComplete="off"
            className="font-mono"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={wiping}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matches || wiping}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {wiping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…
              </>
            ) : (
              "I understand — delete everything"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
