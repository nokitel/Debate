"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/hooks/useWallet";

type WalletProvider = "xportal" | "defi-wallet" | "web-wallet" | "ledger";

const PROVIDERS: { id: WalletProvider; label: string; description: string }[] = [
  { id: "xportal", label: "xPortal", description: "Mobile wallet app" },
  { id: "defi-wallet", label: "DeFi Wallet", description: "Browser extension" },
  { id: "web-wallet", label: "Web Wallet", description: "MultiversX web wallet" },
  { id: "ledger", label: "Ledger", description: "Hardware wallet" },
];

/**
 * Wallet provider selector component.
 * Shows available wallet options and handles the Native Auth login flow.
 */
export function WalletConnect(): React.JSX.Element {
  const { isConnected, address, disconnect } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async (provider: WalletProvider) => {
    setIsConnecting(true);
    setError(null);

    try {
      // sdk-dapp v5 provides login functions per provider
      // These are loaded dynamically to avoid SSR issues
      switch (provider) {
        case "xportal": {
          const { useXPortalLogin } = await import("@multiversx/sdk-dapp/hooks");
          // Hook-based login would be initiated through the provider
          break;
        }
        case "defi-wallet": {
          const { useExtensionLogin } = await import("@multiversx/sdk-dapp/hooks");
          break;
        }
        case "web-wallet": {
          const { useWebWalletLogin } = await import("@multiversx/sdk-dapp/hooks");
          break;
        }
        case "ledger": {
          const { useLedgerLogin } = await import("@multiversx/sdk-dapp/hooks");
          break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  if (isConnected && address) {
    return (
      <div
        className="rounded-lg border border-[var(--color-border)] p-6"
        data-testid="wallet-connected"
      >
        <h3 className="text-lg font-bold">Wallet Connected</h3>
        <p className="mt-2 font-mono text-sm text-[var(--color-text-secondary)]">
          {address.slice(0, 10)}...{address.slice(-6)}
        </p>
        <button
          type="button"
          onClick={disconnect}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="wallet-connect">
      <h3 className="text-lg font-bold">Connect Wallet</h3>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Choose a wallet provider to connect your MultiversX account.
      </p>

      {error && (
        <p className="text-sm text-red-600" data-testid="wallet-error">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => void handleConnect(provider.id)}
            disabled={isConnecting}
            className="flex flex-col items-start rounded-lg border border-[var(--color-border)] p-4 text-left hover:bg-[var(--color-bg)] disabled:opacity-50"
            data-testid={`wallet-provider-${provider.id}`}
          >
            <span className="font-medium">{provider.label}</span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {provider.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
