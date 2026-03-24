import React from "react";
import { Shield, Lock, Eye, EyeOff, Server, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Trust indicator badges and banners for zero-trust UX.
 * Show users their data is encrypted and the server cannot access it.
 */

export const EncryptionBadge = () => (
  <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 text-xs">
    <Lock className="h-3 w-3" />
    End-to-end encrypted
  </Badge>
);

export const ZeroKnowledgeBadge = () => (
  <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 text-primary text-xs">
    <EyeOff className="h-3 w-3" />
    Zero-knowledge — we cannot access your data
  </Badge>
);

export const OnChainBadge = () => (
  <Badge variant="outline" className="gap-1.5 border-accent/30 bg-accent/5 text-accent-foreground text-xs">
    <Shield className="h-3 w-3" />
    Enforced on-chain
  </Badge>
);

export const SecurityBanner = () => (
  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
      <Shield className="h-5 w-5 text-emerald-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground">Your data is protected</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        All will data is encrypted on your device before being stored. Our servers never see your plaintext data.
        Asset distribution is enforced by smart contracts — no single party can release funds.
      </p>
    </div>
    <div className="flex flex-wrap gap-1.5">
      <EncryptionBadge />
      <OnChainBadge />
    </div>
  </div>
);

export const LivenessBadge = ({ status }: { status: "ACTIVE" | "WARNING" | "CHALLENGE_PENDING" | "EXPIRED" }) => {
  const config = {
    ACTIVE: { color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600", label: "Liveness: Active", icon: CheckCircle2 },
    WARNING: { color: "border-amber-500/30 bg-amber-500/5 text-amber-600", label: "Check-in due", icon: Eye },
    CHALLENGE_PENDING: { color: "border-destructive/30 bg-destructive/5 text-destructive", label: "Challenge pending", icon: Server },
    EXPIRED: { color: "border-destructive/30 bg-destructive/5 text-destructive", label: "Overdue", icon: Server },
  };
  const cfg = config[status];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`gap-1.5 text-xs ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
};

export const AuditTrailIndicator = ({ eventCount }: { eventCount: number }) => (
  <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-muted-foreground text-xs">
    <Server className="h-3 w-3" />
    {eventCount} audited events
  </Badge>
);
