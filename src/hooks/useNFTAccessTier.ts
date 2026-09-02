import { useCallback, useEffect, useState } from "react";
import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";
import {
  ALL_GATED_COLLECTIONS,
  DISCOUNT_COLLECTIONS,
  FREE_COLLECTIONS,
  type AccessTier,
  type NftCollection,
} from "@/config/nftCollections";

const DELEGATE_REGISTRY_V2 = "0x00000000000000447e69651d841bD8D104Bed493" as const;

const DELEGATE_REGISTRY_ABI = [
  {
    name: "getIncomingDelegations",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "to", type: "address" }],
    outputs: [
      {
        name: "delegations_",
        type: "tuple[]",
        components: [
          { name: "type_", type: "uint8" },
          { name: "to", type: "address" },
          { name: "from", type: "address" },
          { name: "rights", type: "bytes32" },
          { name: "contract_", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "amount", type: "uint256" },
        ],
      },
    ],
  },
] as const;

const ERC721_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// DelegationType enum: NONE=0, ALL=1, CONTRACT=2, ERC721=3
const DELEGATION_ALL = 1;
const DELEGATION_CONTRACT = 2;
const DELEGATION_ERC721 = 3;

const client = createPublicClient({ chain: mainnet, transport: http() });

async function ownsAny(wallet: Address, collections: NftCollection[]): Promise<NftCollection | null> {
  const results = await Promise.all(
    collections.map(async (c) => {
      try {
        const bal = (await client.readContract({
          address: c.address,
          abi: ERC721_BALANCE_ABI,
          functionName: "balanceOf",
          args: [wallet],
        } as any)) as bigint;
        return bal > 0n ? c : null;
      } catch {
        return null;
      }
    })
  );
  return results.find(Boolean) ?? null;
}

export interface NFTAccessResult {
  /** Pricing tier the connected wallet qualifies for. */
  tier: AccessTier;
  /** The collection that granted the tier, if any. */
  matchedCollection: NftCollection | null;
  /** True when the holding was proven through a delegate.cash delegation. */
  viaDelegation: boolean;
  isChecking: boolean;
  recheck: () => void;
}

/**
 * Verifies ownership of at least one NFT from the gated collections, counting
 * both wallets that hold directly and wallets delegated through delegate.cash V2.
 */
export function useNFTAccessTier(address: Address | undefined): NFTAccessResult {
  const [tier, setTier] = useState<AccessTier>("standard");
  const [matchedCollection, setMatchedCollection] = useState<NftCollection | null>(null);
  const [viaDelegation, setViaDelegation] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [nonce, setNonce] = useState(0);

  const recheck = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!address) {
      setTier("standard");
      setMatchedCollection(null);
      setViaDelegation(false);
      return;
    }
    let cancelled = false;

    const run = async () => {
      setIsChecking(true);
      try {
        // 1. Wallets whose holdings count for this address: itself plus delegators.
        const candidates = new Map<string, { wallet: Address; delegated: boolean; scope: Set<string> | null }>();
        candidates.set(address.toLowerCase(), { wallet: address, delegated: false, scope: null });

        try {
          const delegations = (await client.readContract({
            address: DELEGATE_REGISTRY_V2,
            abi: DELEGATE_REGISTRY_ABI,
            functionName: "getIncomingDelegations",
            args: [address],
          } as any)) as ReadonlyArray<{ type_: number; from: string; contract_: string }>;

          for (const d of delegations) {
            const type = Number(d.type_);
            const from = d.from.toLowerCase();
            const existing = candidates.get(from);
            if (type === DELEGATION_ALL) {
              candidates.set(from, { wallet: d.from as Address, delegated: true, scope: null });
            } else if (type === DELEGATION_CONTRACT || type === DELEGATION_ERC721) {
              const scope = existing?.scope ?? new Set<string>();
              if (existing && existing.scope === null) continue; // already unrestricted
              scope.add(d.contract_.toLowerCase());
              candidates.set(from, { wallet: d.from as Address, delegated: true, scope });
            }
          }
        } catch (e) {
          console.warn("delegate.cash lookup failed:", e);
        }

        // 2. Check free collections first, then discount collections.
        let foundFree: { c: NftCollection; delegated: boolean } | null = null;
        let foundDiscount: { c: NftCollection; delegated: boolean } | null = null;

        for (const { wallet, delegated, scope } of candidates.values()) {
          const allowed = (list: NftCollection[]) =>
            scope ? list.filter((c) => scope.has(c.address.toLowerCase())) : list;

          if (!foundFree) {
            const free = await ownsAny(wallet, allowed(FREE_COLLECTIONS));
            if (free) foundFree = { c: free, delegated };
          }
          if (!foundFree && !foundDiscount) {
            const disc = await ownsAny(wallet, allowed(DISCOUNT_COLLECTIONS));
            if (disc) foundDiscount = { c: disc, delegated };
          }
          if (foundFree) break;
        }

        if (cancelled) return;

        if (foundFree) {
          setTier("free");
          setMatchedCollection(foundFree.c);
          setViaDelegation(foundFree.delegated);
        } else if (foundDiscount) {
          setTier("discounted");
          setMatchedCollection(foundDiscount.c);
          setViaDelegation(foundDiscount.delegated);
        } else {
          setTier("standard");
          setMatchedCollection(null);
          setViaDelegation(false);
        }
      } catch (e) {
        console.error("NFT access check failed:", e);
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [address, nonce]);

  return { tier, matchedCollection, viaDelegation, isChecking, recheck };
}

export { ALL_GATED_COLLECTIONS };
