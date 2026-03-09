import { useState, useCallback } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { parseEther, decodeEventLog, type Log } from "viem";
import { CONTRACTS, VAULT_FACTORY_ABI, INHERITANCE_VAULT_ABI } from "@/config/contracts";
import { apechain } from "@/config/wagmi";

export interface DeployVaultArgs {
  beneficiaries: `0x${string}`[];
  allocations: number[];
}

export function useDeployVault() {
  const [vaultAddress, setVaultAddress] = useState<`0x${string}` | null>(null);
  const { address: account } = useAccount();
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash: txHash });

  if (receipt && !vaultAddress) {
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: VAULT_FACTORY_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "VaultCreated" && "vault" in decoded.args) {
          setVaultAddress(decoded.args.vault as `0x${string}`);
          break;
        }
      } catch {
        // not our event
      }
    }
  }

  const deploy = useCallback(
    ({ beneficiaries, allocations }: DeployVaultArgs) => {
      if (!account) return;
      setVaultAddress(null);
      writeContract({
        account,
        chain: apechain,
        address: CONTRACTS.VAULT_FACTORY,
        abi: VAULT_FACTORY_ABI,
        functionName: "createVault",
        args: [beneficiaries, allocations.map((a) => BigInt(a))],
      });
    },
    [writeContract, account]
  );

  return { deploy, txHash, isPending, isConfirming, isSuccess, vaultAddress, error, reset };
}

export function useDepositToVault(vaultAddress?: `0x${string}`) {
  const { address: account } = useAccount();
  const { writeContract, data: txHash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const deposit = useCallback(
    (ethAmount: string) => {
      if (!vaultAddress || !account) return;
      writeContract({
        account,
        chain: apechain,
        address: vaultAddress,
        abi: INHERITANCE_VAULT_ABI,
        functionName: "deposit",
        value: parseEther(ethAmount),
      });
    },
    [vaultAddress, writeContract, account]
  );

  return { deposit, txHash, isPending, isConfirming, isSuccess, error };
}

export function useVaultState(vaultAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: vaultAddress,
    abi: INHERITANCE_VAULT_ABI,
    functionName: "getVaultState",
    query: { enabled: !!vaultAddress },
  });

  const parsed = data
    ? {
        beneficiaryVote: (data as [boolean, boolean, boolean, bigint])[0],
        oracleVote: (data as [boolean, boolean, boolean, bigint])[1],
        isDistributed: (data as [boolean, boolean, boolean, bigint])[2],
        totalEth: (data as [boolean, boolean, boolean, bigint])[3],
      }
    : null;

  return { state: parsed, isLoading, refetch };
}
