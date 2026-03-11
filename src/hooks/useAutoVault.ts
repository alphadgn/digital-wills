import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { useDeployVault } from "@/hooks/useVaultContract";
import { getVaultsForWallet, createVault } from "@/lib/supabaseVault";
import { toast } from "sonner";

/**
 * Auto-creates a vault for authenticated users who don't have one yet.
 * Checks Supabase for existing vaults. If none found, deploys on-chain and stores in DB.
 */
export function useAutoVault() {
  const { isAuthenticated, walletAddress, isLoading, getAccessToken } = useAuth();
  const { deploy, vaultAddress: deployedVaultAddress, isSuccess, isPending, isConfirming } = useDeployVault();
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Check Supabase for existing vault when wallet connects
  useEffect(() => {
    if (isLoading || !isAuthenticated || !walletAddress || hasChecked) return;

    const checkExisting = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const vaults = await getVaultsForWallet(token);
        if (vaults.length > 0) {
          setVaultAddress(vaults[0].vault_contract_address);
          setVaultId(vaults[0].id);
          setHasChecked(true);
        } else {
          // Auto-deploy a new vault
          setIsCreating(true);
          setHasChecked(true);
          deploy({
            beneficiaries: [walletAddress as `0x${string}`],
            allocations: [100],
          });
          toast.info("Creating your vault automatically...");
        }
      } catch (e) {
        console.error("Failed to check vaults:", e);
        setHasChecked(true);
      }
    };

    checkExisting();
  }, [isAuthenticated, walletAddress, isLoading, hasChecked, deploy, getAccessToken]);

  // Store vault in Supabase once deployed on-chain
  useEffect(() => {
    if (isSuccess && deployedVaultAddress && walletAddress) {
      const store = async () => {
        try {
          const token = await getAccessToken();
          if (!token) return;
          const vault = await createVault(token, walletAddress, deployedVaultAddress);
          setVaultAddress(deployedVaultAddress);
          setVaultId(vault.id);
          setIsCreating(false);
          toast.success("Your vault has been created!");
        } catch (e) {
          console.error("Failed to store vault:", e);
          // Still set the address even if DB fails
          setVaultAddress(deployedVaultAddress);
          setIsCreating(false);
          toast.success("Vault deployed! (DB sync pending)");
        }
      };
      store();
    }
  }, [isSuccess, deployedVaultAddress, walletAddress, getAccessToken]);

  return {
    vaultAddress,
    vaultId,
    isCreating: isCreating && (isPending || isConfirming),
    hasVault: !!vaultAddress,
  };
}
