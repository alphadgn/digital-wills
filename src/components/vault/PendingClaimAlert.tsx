import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { getVaultClaims, cancelClaim, type ClaimRow } from "@/lib/claimApi";
import { useDonorClaimResponse, useVaultState } from "@/hooks/useVaultContract";
import { isDeployed } from "@/config/contracts";
import { activeChain } from "@/config/wagmi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

/**
 * Donor-facing notice that a beneficiary has filed a claim.
 *
 * This is the other half of the notification: the donor is told by email or SMS that the vault
 * froze, and this is where they act on it.
 *
 * Cancelling is a two-part operation. The binding rejection is `donorCancel()` on the vault,
 * which clears every approval on-chain, unfreezes the vault and records proof of life. The
 * database call only mirrors that outcome, so it runs after the transaction confirms — never
 * instead of it.
 */

const CANCELLABLE: ClaimRow["status"][] = ["INITIATED", "VERIFICATION_PENDING"];

const shortWallet = (w: string) => `${w.slice(0, 6)}...${w.slice(-4)}`;

interface PendingClaimAlertProps {
  vaultId: string;
  vaultContractAddress: string | null;
  onRefresh: () => void;
}

const PendingClaimAlert: React.FC<PendingClaimAlertProps> = ({
  vaultId,
  vaultContractAddress,
  onRefresh,
}) => {
  const { getAccessToken } = useAuth();
  const [claim, setClaim] = useState<ClaimRow | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const vaultAddress = (vaultContractAddress ?? undefined) as `0x${string}` | undefined;
  const onChainAvailable = !!vaultAddress && isDeployed(activeChain.id);

  const { state: onChain, refetch: refetchState } = useVaultState(
    onChainAvailable ? vaultAddress : undefined,
  );
  const { cancel, isPending, isConfirming, isSuccess, error, reset } =
    useDonorClaimResponse(vaultAddress);

  const load = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const claims = await getVaultClaims(token, vaultId);
      setClaim(claims.find((c) => CANCELLABLE.includes(c.status)) ?? null);
    } catch (e) {
      console.error("Failed to load vault claims:", e);
    }
  }, [getAccessToken, vaultId]);

  useEffect(() => {
    load();
  }, [load]);

  // Mirror the on-chain cancellation into the database once the transaction confirms.
  useEffect(() => {
    if (!isSuccess || !claim || syncing) return;
    const sync = async () => {
      setSyncing(true);
      try {
        const token = await getAccessToken();
        if (token) await cancelClaim(token, claim.id);
        toast.success("Claim cancelled", {
          description: "Your vault is unfrozen and your check-in has been recorded.",
        });
        setClaim(null);
        setConfirmOpen(false);
        refetchState();
        onRefresh();
      } catch (e: unknown) {
        toast.error("Cancelled on-chain, but the record did not update", {
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setSyncing(false);
        reset();
      }
    };
    sync();
  }, [isSuccess, claim, syncing, getAccessToken, onRefresh, refetchState, reset]);

  useEffect(() => {
    if (error) {
      toast.error("Could not cancel the claim", {
        description: (error as Error).message?.slice(0, 140),
      });
      reset();
    }
  }, [error, reset]);

  const handleCancel = async () => {
    if (!claim) return;

    if (onChainAvailable) {
      // Binding path: the contract clears the approvals.
      cancel();
      return;
    }

    // No deployed vault contract yet — record the cancellation off-chain only.
    setSyncing(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      await cancelClaim(token, claim.id);
      toast.success("Claim cancelled", {
        description: "Recorded off-chain. This vault has no deployed contract yet.",
      });
      setClaim(null);
      setConfirmOpen(false);
      onRefresh();
    } catch (e: unknown) {
      toast.error("Could not cancel the claim", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSyncing(false);
    }
  };

  if (!claim) return null;

  const busy = isPending || isConfirming || syncing;
  const windowEnds = claim.donor_window_ends ? new Date(claim.donor_window_ends) : null;
  const windowPassed = windowEnds ? windowEnds.getTime() < Date.now() : false;
  const authorized = onChain?.isReleaseAuthorized ?? false;

  return (
    <>
      <Card className="mb-8 border-destructive/40 bg-destructive/5">
        <CardContent className="py-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">
                An inheritance claim was filed on this vault
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Filed by{" "}
                <span className="font-mono">{shortWallet(claim.beneficiary_wallet)}</span> on{" "}
                {new Date(claim.created_at).toLocaleDateString()}. Death verification has begun and
                your vault is frozen — no assets can be released unless death is verified and the
                vault&rsquo;s 2-of-3 authorization is satisfied.
              </p>
            </div>
          </div>

          {onChain && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5 text-xs">
                <ShieldCheck className="h-3 w-3" />
                {onChain.approvalCount} of {onChain.requiredApprovals} approvals on-chain
              </Badge>
              {onChain.frozen && (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-destructive/30 bg-destructive/5 text-destructive text-xs"
                >
                  <Lock className="h-3 w-3" />
                  Vault frozen
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              {authorized
                ? "Release has been authorized on-chain. This claim can no longer be cancelled."
                : windowEnds
                  ? windowPassed
                    ? "Your cancellation window has passed."
                    : `You can cancel until ${windowEnds.toLocaleString()}.`
                  : "You can cancel while this claim is pending."}
            </span>
          </div>

          {!authorized && (
            <p className="text-sm text-foreground">
              If you are reading this, you are alive and this claim is improper. Cancelling clears
              it, unfreezes your vault and records proof of life.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={busy || authorized}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isConfirming ? "Confirming..." : "Cancel this claim"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                load();
                refetchState();
              }}
              disabled={busy}
            >
              Refresh
            </Button>
          </div>

          {!onChainAvailable && (
            <p className="text-xs text-muted-foreground">
              This vault has no deployed contract yet, so cancelling records off-chain only.
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this inheritance claim?</AlertDialogTitle>
            <AlertDialogDescription>
              {onChainAvailable
                ? "This sends a transaction to your vault that clears every approval, unfreezes it and records proof of life. Your beneficiary will need to file again."
                : "This clears the claim record and unfreezes your vault. Your beneficiary will need to file again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep the claim</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={busy}>
              {busy ? "Cancelling..." : "Cancel the claim"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PendingClaimAlert;
