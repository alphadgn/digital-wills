import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { mainnet } from "viem/chains";

/**
 * Robinhood Chain — the primary deployment target.
 *
 * An Arbitrum Orbit L2 whose native currency is ETH. Chain ID confirmed against the node
 * itself (`eth_chainId` -> 4663), not just documentation.
 */
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

export const robinhoodChainTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  testnet: true,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://explorer.testnet.chain.robinhood.com" },
  },
});

/** ApeChain — a later deployment target. */
export const apechain = defineChain({
  id: 33139,
  name: "ApeChain",
  nativeCurrency: { name: "APE", symbol: "APE", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.apechain.com/http"] },
  },
  blockExplorers: {
    default: { name: "ApeScan", url: "https://apescan.io" },
  },
});

/** The chain the protocol contracts are deployed to and the app transacts on. */
export const activeChain = robinhoodChain;

export const wagmiConfig = createConfig({
  chains: [robinhoodChain, apechain, mainnet],
  transports: {
    [robinhoodChain.id]: http(),
    [apechain.id]: http(),
    [mainnet.id]: http(),
  },
});
