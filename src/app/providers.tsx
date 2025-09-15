"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, createStorage } from "wagmi";
import { porto } from "porto/wagmi";
import { riseTestnet, riseTestnetConfig } from "rise-wallet";
import { ToastProvider } from "@/components/Toast";

// Web storage per Porto starter (localStorage)
const storage =
  typeof window !== "undefined"
    ? createStorage({
        storage: localStorage,
      })
    : undefined;

export const wagmiConfig = createConfig({
  chains: [riseTestnet],
  transports: {
    [riseTestnet.id]: http(
      process.env.NEXT_PUBLIC_RISE_RPC_URL ||
        "https://rise-testnet-porto.fly.dev",
      { batch: true, retryCount: 3, retryDelay: 1000 }
    ),
  },
  ssr: true,
  storage,
  multiInjectedProviderDiscovery: false,
  connectors: [
    porto({ relay: riseTestnetConfig.relay, mode: riseTestnetConfig.mode }),
  ],
});

type ProvidersProps = { children: React.ReactNode };

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
