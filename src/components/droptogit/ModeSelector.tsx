"use client";

import * as React from "react";
import { Replace, GitCompareArrows, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type { PushMode } from "@/lib/types";

interface ModeSelectorProps {
  value: PushMode;
  onChange: (m: PushMode) => void;
  diff?: { added: number; changed: number; unchanged: number } | null;
  disabled?: boolean;
}

export function ModeSelector({ value, onChange, diff, disabled }: ModeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Push mode</Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <ModeCard
          active={value === "smart"}
          onClick={() => onChange("smart")}
          disabled={disabled}
          icon={<GitCompareArrows className="h-5 w-5" />}
          title="Smart Update"
          description="Only push new and changed files. Unchanged files are skipped — fewer API calls, faster pushes."
          recommended
          footer={
            diff ? (
              <span className="text-xs">
                <span className="font-semibold text-brand-green">{diff.added}</span> new ·{" "}
                <span className="font-semibold text-amber-500">{diff.changed}</span> changed ·{" "}
                <span className="font-semibold text-muted-foreground">{diff.unchanged}</span> unchanged
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                A diff will be calculated before pushing.
              </span>
            )
          }
        />
        <ModeCard
          active={value === "replace"}
          onClick={() => onChange("replace")}
          disabled={disabled}
          icon={<Replace className="h-5 w-5" />}
          title="Replace Everything"
          description="Completely replace the repository contents with the uploaded project in one clean commit."
          warning="Destructive — all existing files not in your upload will be removed."
        />
      </div>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  disabled,
  icon,
  title,
  description,
  warning,
  recommended,
  footer,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  warning?: string;
  recommended?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all",
        active
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card/40 hover:border-primary/40 hover:bg-card/70",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {recommended && (
        <span className="absolute right-3 top-3 rounded-full bg-brand-green/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-green">
          Recommended
        </span>
      )}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          {icon}
        </span>
        <span className="font-semibold">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {footer && <div className="mt-1">{footer}</div>}
      {warning && (
        <div className="mt-1 flex items-start gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{warning}</span>
        </div>
      )}
    </button>
  );
}
