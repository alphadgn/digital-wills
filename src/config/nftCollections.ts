/**
 * Access-tier collections.
 *
 * Holding at least one NFT from a FREE collection grants free access.
 * Holding at least one NFT from a DISCOUNT collection grants the $59.95 rate.
 * Everyone else pays the standard $99.95 price.
 */

export interface NftCollection {
  name: string;
  address: `0x${string}`;
}

export const FREE_COLLECTIONS: NftCollection[] = [
  { name: "The Temp Agency", address: "0xc60283eBe17F6A6d7b49C1Df3602f440D98f5d25" },
  { name: "Bored Ape Yacht Club", address: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D" },
  { name: "StonkBrokers", address: "0x539CdD042c2f3d93EbC5BE7DfFf0c79F3B4fAbF0" },
];

export const DISCOUNT_COLLECTIONS: NftCollection[] = [
  { name: "Mutant Ape Yacht Club", address: "0x60E4d786628Fea6478F785A6d7e704777c86a7c6" },
];

export const ALL_GATED_COLLECTIONS = [...FREE_COLLECTIONS, ...DISCOUNT_COLLECTIONS];

export const PRICING = {
  standard: 99.95,
  discounted: 59.95,
} as const;

export type AccessTier = "free" | "discounted" | "standard";
