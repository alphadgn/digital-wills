import React, { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { useConfigureVault, useVaultState } from "@/hooks/useVaultContract";
import { INHERITANCE_VAULT_ABI } from "@/config/abis";
import { getAddresses, isDeployed } from "@/config/contracts";
import { activeChain } from "@/config/wagmi";

/**
 * The vault's 2-of-3 signer set, and the one-time wiring that activates it.
 *
 * A freshly deployed vault does not know its ClaimManager, and until it does, no beneficiary
 * claim can freeze it and no donor cancellation is possible. This surfaces that state plainly
 * rather than letting a donor believe protection is active when it is not.
 */

const ZERO = "0x0000000000000000000000000000000000000000";

interface VaultGovernanceProps {
  vaultContractAddress: string | null;
  onRefresh: () => void;
}

const SignerRow = ({
  role,
  detail,
  approved,
}: {
  role: string;
  detail: string;
  approved?: boolean;
}) => (
  <div className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-0">
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{role}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
    </div>
    {approved !== undefined && (
      <Badge
        variant="outline"
        className={
          approved
            ? "shrink-0 border-emerald-500/30 bg-emerald-500/5 text-emerald-600 text-xs"
            : "shrink-0 text-xs text-muted-foreground"
        }
      >
        {approved ? "Approved" : "No approval"}
      </Badge>
    )}
  </div>
);

const VaultGovernance: React.FC<VaultGovernanceProps> = ({
  vaultContractAddress,
  onRefresh,
}) => {
  const [wiring, setWiring] = useState(false);
  const vaultAddress = (vaultContractAddress ?? undefined) as `0x${string}` | undefined;
  const protocolDeployed = isDeployed(activeChain.id);
  const enabled = !!vaultAddress && protocolDeployed;

  const addresses = getAddresses(activeChain.id);
  const { state, refetch } = useVaultState(enabled ? vaultAddress : undefined);
  const { setClaimManager, isPending, isConfirming, isSuccess, error, reset } =
    useConfigureVault(vaultAddress);

  const { data: wiredClaimManager, refetch: refetchWiring } = useReadContract({
    address: enabled ? vaultAddress : undefined,
    abi: INHERITANCE_VAULT_ABI,
    functionName: "claimManager",
    query: { enabled },
  });

  const { data: oracleAuthority } = useReadContract({
    address: enabled ? vaultAddress : undefined,
    abi: INHERITANCE_VAULT_ABI,
    functionName: "oracleAuthority",
    query: { enabled },
  });

  const isWired =
    !!wiredClaimManager &&
    (wiredClaimManager as string).toLowerCase() === addresses.CLAIM_MANAGER.toLowerCase() &&
    addresses.CLAIM_MANAGER !== ZERO;

  useEffect(() => {
    if (isSuccess && wiring) {
      toast.success("Vault wired", {
        description: "Claims can now freeze this vault and you can cancel them.",
      });
      setWiring(false);
      refetchWiring();
      refetch();
      onRefresh();
      reset();
    }
  }, [isSuccess, wiring, refetchWiring, refetch, onRefresh, reset]);

  useEffect(() => {
    if (error) {
      toast.error("Could not wire the vault", {
        description: (error as Error).message?.slice(0, 140),
      });
      setWiring(false);
      reset();
    }
  }, [error, reset]);

  if (!vaultContractAddress) return null;

  const busy = isPending || isConfirming;

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Vault authorization</CardTitle>
        </div>
        <CardDescription>
          Two of these three signers must approve before any assets are released.
          {state ? ` Currently ${state.approvalCount} of ${state.requiredApprovals}.` : ""}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <SignerRow
            role="You — the Donor"
            detail="You own the assets and control this will while alive."
          />
          <SignerRow
            role="Your Beneficiary"
            detail="Approves by filing a claim. Cannot access the vault alone."
          />
          <SignerRow
            role="The Oracle Authority"
            detail={
              oracleAuthority && oracleAuthority !== ZERO
                ? `Independent death verification — ${(oracleAuthority as string).slice(0, 6)}...${(oracleAuthority as string).slice(-4)}`
                : "Independent verification system that confirms death."
            }
          />
        </div>

        {!protocolDeployed ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              The protocol contracts are not yet deployed to {activeChain.name}. On-chain claim
              handling is unavailable until they are.
            </AlertDescription>
          </Alert>
        ) : isWired ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-sm text-muted-foreground">
              This vault is wired. A claim will freeze it and notify you, and you can cancel while
              alive.
            </p>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-3">
              <p className="text-sm">
                This vault does not yet know its claim manager. Until it does, a beneficiary claim
                cannot freeze it and you cannot cancel one on-chain.
              </p>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => {
                  setWiring(true);
                  setClaimManager(addresses.CLAIM_MANAGER);
                }}
                className="gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isConfirming ? "Confirming..." : "Wire this vault"}
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default VaultGovernance;
