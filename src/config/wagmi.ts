import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { mainnet } from "viem/chains";

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

export const wagmiConfig = createConfig({
  chains: [apechain, mainnet],
  transports: {
    [apechain.id]: http(),
    [mainnet.id]: http(),
  },
});
