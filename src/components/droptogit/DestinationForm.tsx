"use client";

import * as React from "react";
import { FolderInput } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeDestination } from "@/lib/zip";

interface DestinationFormProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function DestinationForm({ value, onChange, disabled }: DestinationFormProps) {
  const [raw, setRaw] = React.useState(value);

  React.useEffect(() => {
    setRaw(value);
  }, [value]);

  return (
    <div className="space-y-2">
      <Label htmlFor="destination" className="flex items-center gap-1.5">
        <FolderInput className="h-3.5 w-3.5 text-brand-blue" />
        Destination subfolder (optional)
      </Label>
      <Input
        id="destination"
        value={raw}
        disabled={disabled}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => onChange(sanitizeDestination(raw))}
        placeholder="e.g. src or packages/core — leave empty for repo root"
        className="h-11 font-mono text-sm"
      />
      <p className="text-xs text-muted-foreground">
        Uploaded files will be placed under this path. Unsafe segments
        (<code className="rounded bg-muted px-1">..</code>, absolute paths) are
        stripped automatically.
      </p>
    </div>
  );
}
