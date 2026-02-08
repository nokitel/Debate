"use client";

import { useCallback, useMemo } from "react";

/**
 * Hook for MultiversX wallet state and actions.
 *
 * Uses sdk-dapp v5 hooks under the hood.
 * Safe to call in any client component — returns disconnected state
 * if DappProvider is not mounted.
 */

interface WalletState {
  /** Whether a wallet is connected. */
  isConnected: boolean;
  /** The connected bech32 address, or null. */
  address: string | null;
  /** Disconnect the wallet. */
  disconnect: () => void;
  /** Whether a login operation is in progress. */
  isLoggingIn: boolean;
}

/**
 * Custom hook wrapping sdk-dapp wallet state.
 * Returns a simplified interface for wallet connection status.
 */
export function useWallet(): WalletState {
  // sdk-dapp v5 provides these hooks:
  // - useGetAccount() for address
  // - useGetIsLoggedIn() for login state
  // - logout() for disconnection
  //
  // We wrap them here to isolate sdk-dapp API from the rest of the app.
  // When sdk-dapp is not loaded (SSR or no DappProvider), we return defaults.

  let address: string | null = null;
  let isLoggedIn = false;

  try {
    // Dynamic imports for sdk-dapp hooks to avoid SSR issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useGetAccount, useGetIsLoggedIn } = require("@multiversx/sdk-dapp/hooks");
    const account = useGetAccount();
    isLoggedIn = useGetIsLoggedIn();
    address = account?.address ?? null;
  } catch {
    // sdk-dapp not available (SSR or provider not mounted)
  }

  const disconnect = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { logout } = require("@multiversx/sdk-dapp/utils");
      logout();
    } catch {
      // sdk-dapp not available
    }
  }, []);

  return useMemo(
    () => ({
      isConnected: isLoggedIn && !!address,
      address: isLoggedIn ? address : null,
      disconnect,
      isLoggingIn: false,
    }),
    [isLoggedIn, address, disconnect],
  );
}
