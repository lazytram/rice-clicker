"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, webSocket, createStorage } from "wagmi";
import { riseTestnet } from "viem/chains";
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
    [riseTestnet.id]: webSocket(
      process.env.NEXT_PUBLIC_RISE_WS_URL || "wss://testnet.riselabs.xyz/ws"
    ),
  },
  ssr: true,
  storage,
  multiInjectedProviderDiscovery: false,
  connectors: [],
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
