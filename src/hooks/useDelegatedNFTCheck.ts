import { useEffect, useState } from "react";
import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";

const DELEGATE_REGISTRY_V2 = "0x00000000000000447e69651d841bD8D104Bed493" as const;
const BAYC_CONTRACT = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D" as const;
const MAYC_CONTRACT = "0x60E4d786628Fea6478F785A6d7e704777c86a7c6" as const;

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

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export function useDelegatedNFTCheck(address: Address | undefined) {
  const [hasDelegatedBAYC, setHasDelegatedBAYC] = useState(false);
  const [hasDelegatedMAYC, setHasDelegatedMAYC] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    const check = async () => {
      setIsChecking(true);
      try {
        const delegations = await client.readContract({
          address: DELEGATE_REGISTRY_V2,
          abi: DELEGATE_REGISTRY_ABI,
          functionName: "getIncomingDelegations",
          args: [address],
        });

        const baycDelegators = new Set<Address>();
        const maycDelegators = new Set<Address>();

        for (const d of delegations) {
          const type = Number(d.type_);
          const contractAddr = d.contract_.toLowerCase();

          if (type === DELEGATION_ALL) {
            baycDelegators.add(d.from as Address);
            maycDelegators.add(d.from as Address);
          } else if (type === DELEGATION_CONTRACT || type === DELEGATION_ERC721) {
            if (contractAddr === BAYC_CONTRACT.toLowerCase()) {
              baycDelegators.add(d.from as Address);
            } else if (contractAddr === MAYC_CONTRACT.toLowerCase()) {
              maycDelegators.add(d.from as Address);
            }
          }
        }

        let foundBAYC = false;
        let foundMAYC = false;

        const balanceChecks: Promise<void>[] = [];

        for (const delegator of baycDelegators) {
          balanceChecks.push(
            client
              .readContract({
                address: BAYC_CONTRACT,
                abi: ERC721_BALANCE_ABI,
                functionName: "balanceOf",
                args: [delegator],
              })
              .then((bal) => {
                if (bal > 0n) foundBAYC = true;
              })
              .catch(() => {})
          );
        }

        for (const delegator of maycDelegators) {
          balanceChecks.push(
            client
              .readContract({
                address: MAYC_CONTRACT,
                abi: ERC721_BALANCE_ABI,
                functionName: "balanceOf",
                args: [delegator],
              })
              .then((bal) => {
                if (bal > 0n) foundMAYC = true;
              })
              .catch(() => {})
          );
        }

        await Promise.all(balanceChecks);

        if (!cancelled) {
          setHasDelegatedBAYC(foundBAYC);
          setHasDelegatedMAYC(foundMAYC);
        }
      } catch (error) {
        console.error("Delegate.cash V2 check failed:", error);
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [address]);

  return { hasDelegatedBAYC, hasDelegatedMAYC, isChecking };
}
