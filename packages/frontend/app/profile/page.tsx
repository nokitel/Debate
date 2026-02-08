"use client";

import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { SubscriptionStatus } from "@/components/pricing/SubscriptionStatus";

/**
 * User profile page.
 * Shows wallet connection status and subscription info.
 */
export default function ProfilePage(): React.JSX.Element {
  const { isConnected, address } = useWallet();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12" data-testid="profile-page">
      <h1 className="mb-8 text-2xl font-bold">Profile</h1>

      <section className="mb-8 rounded-lg border border-[var(--color-border)] p-6">
        <h2 className="mb-4 text-lg font-bold">Wallet</h2>
        {isConnected && address ? (
          <div>
            <p className="font-mono text-sm text-[var(--color-text-secondary)]">
              {address.slice(0, 10)}...{address.slice(-6)}
            </p>
            <Link
              href="/profile/wallet"
              className="mt-2 inline-block text-sm text-blue-600 hover:underline"
            >
              Manage wallet
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[var(--color-text-secondary)]">No wallet connected.</p>
            <Link
              href="/profile/wallet"
              className="mt-2 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Connect Wallet
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[var(--color-border)] p-6">
        <h2 className="mb-4 text-lg font-bold">Subscription</h2>
        <SubscriptionStatus />
      </section>
    </main>
  );
}
