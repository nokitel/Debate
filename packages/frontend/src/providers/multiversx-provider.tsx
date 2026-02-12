"use client";

import { type ReactNode, type ComponentType, useMemo } from "react";
import dynamic from "next/dynamic";
import { getMultiversXConfig } from "@/lib/multiversx";

/** Props accepted by sdk-dapp DappProvider. Typed locally until SDK is installed. */
interface DappProviderProps {
  children: ReactNode;
  environment: string;
  customNetworkConfig: {
    name: string;
    apiAddress: string;
    chainId: string;
    explorerAddress: string;
  };
}

/**
 * Dynamic import of DappProvider with SSR disabled.
 * sdk-dapp v5 uses Zustand internally and cannot be server-rendered.
 */
const DappProvider = dynamic(
  async () => {
    // @ts-expect-error — sdk-dapp not installed yet (P5.FE)
    const mod = await import("@multiversx/sdk-dapp/DappProvider");
    return mod.DappProvider as ComponentType<DappProviderProps>;
  },
  { ssr: false },
) as ComponentType<DappProviderProps>;

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
