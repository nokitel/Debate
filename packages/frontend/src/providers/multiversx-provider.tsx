"use client";

import { type ReactNode, useMemo } from "react";
import dynamic from "next/dynamic";
import { getMultiversXConfig } from "@/lib/multiversx";

/**
 * Dynamic import of DappProvider with SSR disabled.
 * sdk-dapp v5 uses Zustand internally and cannot be server-rendered.
 */
const DappProvider = dynamic(
  async () => {
    const mod = await import("@multiversx/sdk-dapp/DappProvider");
    return mod.DappProvider;
  },
  { ssr: false },
);

interface MultiversXProviderProps {
  children: ReactNode;
}

/**
 * MultiversX wallet context provider.
 * Wraps DappProvider with devnet configuration.
 * Must be rendered inside a "use client" boundary.
 */
export function MultiversXProvider({ children }: MultiversXProviderProps): React.JSX.Element {
  const config = useMemo(() => getMultiversXConfig(), []);

  return (
    <DappProvider
      environment={config.environment}
      customNetworkConfig={{
        name: "dialectical-devnet",
        apiAddress: config.apiUrl,
        chainId: config.chainId,
        explorerAddress: config.explorerUrl,
      }}
    >
      {children}
    </DappProvider>
  );
}
