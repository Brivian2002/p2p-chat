"use client";

import * as React from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  LogOut,
  Github,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CredentialsFormProps {
  token: string;
  onTokenChange: (v: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  connectedLogin: string | null;
  loading: boolean;
  error: string | null;
}

export function CredentialsForm({
  token,
  onTokenChange,
  onConnect,
  onDisconnect,
  connectedLogin,
  loading,
  error,
}: CredentialsFormProps) {
  const [show, setShow] = React.useState(false);
  const connected = !!connectedLogin;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pat" className="flex items-center gap-1.5">
          <KeyRound className="h-3.5 w-3.5 text-brand-green" />
          GitHub Personal Access Token
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="pat"
              type={show ? "text" : "password"}
              value={token}
              disabled={connected || loading}
              onChange={(e) => onTokenChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !connected && token.trim()) onConnect();
              }}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
              spellCheck={false}
              className="h-11 pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Hide token" : "Show token"}
              tabIndex={-1}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {connected ? (
            <Button variant="outline" onClick={onDisconnect} className="h-11">
              <LogOut className="mr-1.5 h-4 w-4" /> Disconnect
            </Button>
          ) : (
            <Button
              onClick={onConnect}
              disabled={loading || !token.trim()}
              className="h-11"
            >
              {loading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Github className="mr-1.5 h-4 w-4" />
              )}
              Connect
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {connected && connectedLogin && (
          <div className="flex items-center gap-2 text-sm text-brand-green">
            <CheckCircle2 className="h-4 w-4" />
            Connected as{" "}
            <span className="font-mono font-medium">@{connectedLogin}</span>
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex items-start gap-2 rounded-lg border border-brand-green/20 bg-brand-green/5 px-3 py-2 text-xs text-muted-foreground",
        )}
      >
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-green" />
        <span>
          Your token is used only for this session and is{" "}
          <strong className="text-foreground">never stored</strong>. It is sent
          directly to GitHub over HTTPS and is not persisted on any server or in
          your browser. Use a fine-grained PAT with only the{" "}
          <code className="rounded bg-muted px-1">repo</code> / Contents
          permission for the repositories you intend to push.
        </span>
      </div>
    </div>
  );
}
