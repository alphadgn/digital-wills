import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/PrivyAuthContext";
import { useDeployVault } from "@/hooks/useVaultContract";
import { toast } from "sonner";

const VAULT_STORAGE_KEY = "digitalwills_user_vault";

interface StoredVault {
  walletAddress: string;
  vaultAddress: string;
  createdAt: string;
}

function getStoredVault(walletAddress: string): StoredVault | null {
  try {
    const data = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!data) return null;
    const vaults: StoredVault[] = JSON.parse(data);
    return vaults.find((v) => v.walletAddress.toLowerCase() === walletAddress.toLowerCase()) ?? null;
  } catch {
    return null;
  }
}

function storeVault(walletAddress: string, vaultAddress: string) {
  try {
    const data = localStorage.getItem(VAULT_STORAGE_KEY);
    const vaults: StoredVault[] = data ? JSON.parse(data) : [];
    vaults.push({ walletAddress, vaultAddress, createdAt: new Date().toISOString() });
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vaults));
  } catch {
    // silent
  }
}

/**
 * Auto-creates a vault for authenticated users who don't have one yet.
 * If the user's Privy wallet already has an associated vault, it reuses that address.
 */
export function useAutoVault() {
  const { isAuthenticated, walletAddress, isLoading } = useAuth();
  const { deploy, vaultAddress: deployedVaultAddress, isSuccess, isPending, isConfirming } = useDeployVault();
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Check for existing vault when wallet connects
  useEffect(() => {
    if (isLoading || !isAuthenticated || !walletAddress || hasChecked) return;

    const existing = getStoredVault(walletAddress);
    if (existing) {
      setVaultAddress(existing.vaultAddress);
      setHasChecked(true);
    } else {
      // Auto-deploy a new vault with the user's wallet as the sole initial beneficiary
      setIsCreating(true);
      setHasChecked(true);
      deploy({
        beneficiaries: [walletAddress as `0x${string}`],
        allocations: [100],
      });
      toast.info("Creating your vault automatically...");
    }
  }, [isAuthenticated, walletAddress, isLoading, hasChecked, deploy]);

  // Store vault once deployed
  useEffect(() => {
    if (isSuccess && deployedVaultAddress && walletAddress) {
      storeVault(walletAddress, deployedVaultAddress);
      setVaultAddress(deployedVaultAddress);
      setIsCreating(false);
      toast.success("Your vault has been created!");
    }
  }, [isSuccess, deployedVaultAddress, walletAddress]);

  return {
    vaultAddress,
    isCreating: isCreating && (isPending || isConfirming),
    hasVault: !!vaultAddress,
  };
}
