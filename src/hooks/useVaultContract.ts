import { useState, useCallback } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseEther, decodeEventLog } from "viem";
import { CONTRACTS, VAULT_FACTORY_ABI, INHERITANCE_VAULT_ABI } from "@/config/contracts";

export interface DeployVaultArgs {
  beneficiaries: `0x${string}`[];
  allocations: number[]; // percentages as integers (e.g. 50, 30, 20)
}

export function useDeployVault() {
  const [vaultAddress, setVaultAddress] = useState<`0x${string}` | null>(null);
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // Parse VaultCreated event from receipt
  if (receipt && !vaultAddress) {
    try {
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: VAULT_FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "VaultCreated") {
            setVaultAddress((decoded.args as any).vault);
          }
        } catch {
          // not our event, skip
        }
      }
    } catch {
      // fallback — use contract address from first log
      if (receipt.logs[0]) {
        setVaultAddress(receipt.logs[0].address as `0x${string}`);
      }
    }
  }

  const deploy = useCallback(
    ({ beneficiaries, allocations }: DeployVaultArgs) => {
      setVaultAddress(null);
      writeContract({
        address: CONTRACTS.VAULT_FACTORY,
        abi: VAULT_FACTORY_ABI,
        functionName: "createVault",
        args: [beneficiaries, allocations.map((a) => BigInt(a))],
      });
    },
    [writeContract]
  );

  return {
    deploy,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    vaultAddress,
    error,
    reset,
  };
}

export function useDepositToVault(vaultAddress?: `0x${string}`) {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const deposit = useCallback(
    (ethAmount: string) => {
      if (!vaultAddress) return;
      writeContract({
        address: vaultAddress,
        abi: INHERITANCE_VAULT_ABI,
        functionName: "deposit",
        value: parseEther(ethAmount),
      });
    },
    [vaultAddress, writeContract]
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
        beneficiaryVote: (data as any)[0] as boolean,
        oracleVote: (data as any)[1] as boolean,
        isDistributed: (data as any)[2] as boolean,
        totalEth: (data as any)[3] as bigint,
      }
    : null;

  return { state: parsed, isLoading, refetch };
}
