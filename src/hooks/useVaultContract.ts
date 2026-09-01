import { useState, useCallback } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
  useSendTransaction,
  useConfig,
} from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { parseEther, decodeEventLog } from "viem";
import { CONTRACTS, getAddresses } from "@/config/contracts";
import {
  VAULT_FACTORY_ABI,
  INHERITANCE_VAULT_ABI,
  CLAIM_MANAGER_ABI,
} from "@/config/abis";
import { activeChain } from "@/config/wagmi";

/**
 * On-chain layer for the inheritance protocol.
 *
 * Every ABI here is generated from the compiled contracts (`npm run sync:abis`), so a call
 * that type-checks is a call the contract actually exposes.
 *
 * Vault governance is 2-of-3 across donor, beneficiary and oracle authority. A beneficiary
 * claim freezes the vault and records one approval; it releases nothing on its own.
 */

/** The three vault signers, matching InheritanceVault.Signer. */
export enum VaultSigner {
  DONOR = 0,
  BENEFICIARY = 1,
  ORACLE = 2,
}

// ── Vault creation ──

export interface DeployVaultArgs {
  /** Liveness window in days. Telemetry only — not a release precondition. */
  inactivityPeriodDays: number;
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
        }) as { eventName: string; args: Record<string, unknown> };
        if (decoded.eventName === "VaultCreated" && decoded.args.vault) {
          setVaultAddress(decoded.args.vault as `0x${string}`);
          break;
        }
      } catch {
        // not our event
      }
    }
  }

  const deploy = useCallback(
    ({ inactivityPeriodDays }: DeployVaultArgs) => {
      if (!account) return;
      setVaultAddress(null);
      writeContract({
        account,
        chain: activeChain,
        address: CONTRACTS.VAULT_FACTORY,
        abi: VAULT_FACTORY_ABI,
        functionName: "createVault",
        args: [BigInt(inactivityPeriodDays)],
      });
    },
    [writeContract, account],
  );

  return { deploy, txHash, isPending, isConfirming, isSuccess, vaultAddress, error, reset };
}

// ── Generic vault write helper ──

function useVaultWrite(vaultAddress?: `0x${string}`) {
  const { address: account } = useAccount();
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const call = useCallback(
    (functionName: string, args: readonly unknown[] = [], value?: bigint) => {
      if (!vaultAddress || !account) return;
      writeContract({
        account,
        chain: activeChain,
        address: vaultAddress,
        abi: INHERITANCE_VAULT_ABI,
        functionName,
        args,
        ...(value !== undefined ? { value } : {}),
      } as never);
    },
    [vaultAddress, account, writeContract],
  );

  return { call, txHash, isPending, isConfirming, isSuccess, error, reset };
}

// ── Deposits ──

/**
 * Fund a vault.
 *
 * The vault has no `deposit()` function — it accepts ETH through `receive()`, so a deposit
 * is a plain value transfer to the vault address.
 */
export function useDepositToVault(vaultAddress?: `0x${string}`) {
  const { address: account } = useAccount();
  const { sendTransaction, data: txHash, isPending, error } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const deposit = useCallback(
    (ethAmount: string) => {
      if (!vaultAddress || !account) return;
      sendTransaction({
        account,
        chain: activeChain,
        to: vaultAddress,
        value: parseEther(ethAmount),
      });
    },
    [vaultAddress, account, sendTransaction],
  );

  return { deposit, txHash, isPending, isConfirming, isSuccess, error };
}

// ── Donor actions ──

/** Wire the vault's claim manager and oracle authority. Required before any claim can freeze it. */
export function useConfigureVault(vaultAddress?: `0x${string}`) {
  const { call, ...rest } = useVaultWrite(vaultAddress);

  const setClaimManager = useCallback(
    (claimManager: `0x${string}`) => call("setClaimManager", [claimManager]),
    [call],
  );
  const setOracleAuthority = useCallback(
    (authority: `0x${string}`) => call("setOracleAuthority", [authority]),
    [call],
  );
  const setDonorWindow = useCallback(
    (seconds: number) => call("setDonorWindow", [BigInt(seconds)]),
    [call],
  );

  return { setClaimManager, setOracleAuthority, setDonorWindow, ...rest };
}

/** Donor beneficiary management. Only available while the vault is unfrozen. */
export function useManageBeneficiaries(vaultAddress?: `0x${string}`) {
  const { call, ...rest } = useVaultWrite(vaultAddress);

  const addBeneficiary = useCallback(
    (wallet: `0x${string}`, allocationBps: number) =>
      call("addBeneficiary", [wallet, BigInt(allocationBps)]),
    [call],
  );
  /** Note: the contract removes by index, not by address. */
  const removeBeneficiary = useCallback(
    (index: number) => call("removeBeneficiary", [BigInt(index)]),
    [call],
  );

  return { addBeneficiary, removeBeneficiary, ...rest };
}

/**
 * The donor's response to a pending claim.
 *
 * `cancel` is the binding, on-chain rejection of an improper claim: it clears every approval,
 * unfreezes the vault and records proof of life. `approve` is the opposite — it supplies the
 * donor's own approval, which together with the beneficiary's meets the 2-of-3 threshold and
 * releases voluntarily.
 */
export function useDonorClaimResponse(vaultAddress?: `0x${string}`) {
  const { call, ...rest } = useVaultWrite(vaultAddress);

  const cancel = useCallback(() => call("donorCancel"), [call]);
  const approve = useCallback(() => call("donorApprove"), [call]);
  const recordActivity = useCallback(() => call("recordActivity"), [call]);

  return { cancel, approve, recordActivity, ...rest };
}

/**
 * Register a vault's beneficiaries on-chain, one transaction each.
 *
 * `addBeneficiary` takes a single beneficiary, so a will with three heirs needs three
 * transactions. They are sent sequentially rather than in parallel: each one bumps the
 * sender's nonce and the vault's `totalAllocatedBps`, and firing them together makes
 * wallets mis-order them or reject the batch. Progress is reported so a donor can see
 * which heir is being written and resume if a transaction is rejected.
 */
export function useRegisterBeneficiaries(vaultAddress?: `0x${string}`) {
  const { address: account } = useAccount();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();

  const [completed, setCompleted] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * @param list allocations in PERCENT; converted to basis points for the contract.
   * @returns the number successfully registered, so a partial run can be resumed.
   */
  const register = useCallback(
    async (list: { address: `0x${string}`; allocationPercent: number }[]) => {
      if (!vaultAddress || !account) return 0;

      setIsRegistering(true);
      setError(null);
      let done = 0;

      try {
        for (const b of list) {
          const hash = await writeContractAsync({
            account,
            chain: activeChain,
            address: vaultAddress,
            abi: INHERITANCE_VAULT_ABI,
            functionName: "addBeneficiary",
            // The contract stores basis points (10000 = 100%).
            args: [b.address, BigInt(Math.round(b.allocationPercent * 100))],
          });

          // Wait for each to confirm before sending the next, so the allocation total
          // the contract checks against is always the settled one.
          await waitForTransactionReceipt(config, { hash });

          done += 1;
          setCompleted(done);
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setIsRegistering(false);
      }

      return done;
    },
    [vaultAddress, account, writeContractAsync, config],
  );

  const reset = useCallback(() => {
    setCompleted(0);
    setError(null);
  }, []);

  return { register, completed, isRegistering, error, reset };
}

// ── Beneficiary actions ──

/** Withdraw a beneficiary's allocation once the vault has authorized release. */
export function useClaimInheritance(vaultAddress?: `0x${string}`) {
  const { call, ...rest } = useVaultWrite(vaultAddress);
  const claim = useCallback((index: number) => call("claim", [BigInt(index)]), [call]);
  return { claim, ...rest };
}

/** File a claim through the ClaimManager. This freezes the vault and opens the donor window. */
export function useInitiateClaim() {
  const { address: account } = useAccount();
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const initiate = useCallback(
    (vaultAddress: `0x${string}`) => {
      if (!account) return;
      writeContract({
        account,
        chain: activeChain,
        address: CONTRACTS.CLAIM_MANAGER,
        abi: CLAIM_MANAGER_ABI,
        functionName: "initiateClaim",
        args: [vaultAddress],
      });
    },
    [account, writeContract],
  );

  return { initiate, txHash, isPending, isConfirming, isSuccess, error, reset };
}

// ── Reads ──

/**
 * Live 2-of-3 authorization state for a vault.
 *
 * Replaces the old `getVaultState()`, which the contract never had. Each value is read from
 * a real getter.
 */
export function useVaultState(vaultAddress?: `0x${string}`) {
  const enabled = { enabled: !!vaultAddress };
  const base = { address: vaultAddress, abi: INHERITANCE_VAULT_ABI } as const;

  const frozen = useReadContract({ ...base, functionName: "frozen", query: enabled });
  const released = useReadContract({ ...base, functionName: "released", query: enabled });
  const approvals = useReadContract({ ...base, functionName: "approvalCount", query: enabled });
  const authorized = useReadContract({
    ...base,
    functionName: "isReleaseAuthorized",
    query: enabled,
  });
  const claimant = useReadContract({ ...base, functionName: "claimant", query: enabled });
  const windowEnds = useReadContract({
    ...base,
    functionName: "donorWindowEnds",
    query: enabled,
  });
  const windowOpen = useReadContract({
    ...base,
    functionName: "donorWindowOpen",
    query: enabled,
  });
  const releasable = useReadContract({
    ...base,
    functionName: "releasableEth",
    query: enabled,
  });
  const beneficiaryCount = useReadContract({
    ...base,
    functionName: "getBeneficiaryCount",
    query: enabled,
  });

  const isLoading =
    frozen.isLoading || released.isLoading || approvals.isLoading || authorized.isLoading;

  const refetch = useCallback(() => {
    frozen.refetch();
    released.refetch();
    approvals.refetch();
    authorized.refetch();
    claimant.refetch();
    windowEnds.refetch();
    windowOpen.refetch();
    releasable.refetch();
    beneficiaryCount.refetch();
  }, [
    frozen, released, approvals, authorized,
    claimant, windowEnds, windowOpen, releasable, beneficiaryCount,
  ]);

  const state =
    frozen.data !== undefined
      ? {
          frozen: frozen.data as boolean,
          released: released.data as boolean,
          approvalCount: Number((approvals.data as bigint | undefined) ?? 0n),
          requiredApprovals: 2,
          isReleaseAuthorized: authorized.data as boolean,
          claimant: claimant.data as `0x${string}` | undefined,
          donorWindowEnds: Number((windowEnds.data as bigint | undefined) ?? 0n),
          donorWindowOpen: windowOpen.data as boolean,
          releasableEth: (releasable.data as bigint | undefined) ?? 0n,
          beneficiaryCount: Number((beneficiaryCount.data as bigint | undefined) ?? 0n),
        }
      : null;

  return { state, isLoading, refetch };
}

/** Vaults a donor has deployed through the factory. */
export function useUserVaults(owner?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.VAULT_FACTORY,
    abi: VAULT_FACTORY_ABI,
    functionName: "getUserVaults",
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  });

  return { vaults: (data as `0x${string}`[] | undefined) ?? [], isLoading, refetch };
}

export { getAddresses };
