"use client";

import Link from "next/link";
import { WalletConnect } from "@/components/auth/WalletConnect";

/**
 * Wallet connection page.
 * Allows users to connect/disconnect their MultiversX wallet.
 */
export default function WalletPage(): React.JSX.Element {
  return (
    <main className="mx-auto max-w-lg px-4 py-12" data-testid="wallet-page">
      <div className="mb-6">
        <Link href="/profile" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Profile
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold">MultiversX Wallet</h1>
      <p className="mb-8 text-sm text-[var(--color-text-secondary)]">
        Connect your MultiversX wallet to enable on-chain argument storage and blockchain-verified
        subscriptions.
      </p>

      <WalletConnect />
    </main>
  );
}
