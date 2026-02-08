"use client";

import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";
import { UsageBar } from "./UsageBar";

const TIER_LABELS: Record<string, string> = {
  explorer: "Explorer (Free)",
  thinker: "Thinker",
  scholar: "Scholar",
  institution: "Institution",
};

/**
 * Displays current subscription tier, renewal date, and usage.
 */
export function SubscriptionStatus(): React.JSX.Element {
  const { info, cancel, isLoading } = useSubscription();

  if (info.isLoading) {
    return <p className="text-sm text-[var(--color-text-secondary)]">Loading...</p>;
  }

  if (info.error || !info.data) {
    return (
      <div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Unable to load subscription info.
        </p>
        <Link href="/pricing" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          View Plans
        </Link>
      </div>
    );
  }

  const { tier, isActive, argumentsUsed, argumentsLimit, renewalDate } = info.data;
  const tierLabel = TIER_LABELS[tier] ?? tier;

  return (
    <div className="space-y-4" data-testid="subscription-status">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{tierLabel}</p>
          {isActive && renewalDate && (
            <p className="text-xs text-[var(--color-text-secondary)]">
              Renews: {new Date(renewalDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <Link
          href="/pricing"
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg)]"
        >
          {isActive ? "Change Plan" : "Upgrade"}
        </Link>
      </div>

      <UsageBar used={argumentsUsed} limit={argumentsLimit} />

      {isActive && tier !== "explorer" && (
        <button
          type="button"
          onClick={() => void cancel()}
          disabled={isLoading}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          Cancel Subscription
        </button>
      )}
    </div>
  );
}
