"use client";

import { useCallback, useState } from "react";
import type { PipelineTier } from "@dialectical/shared";
import { useSubscription } from "@/hooks/useSubscription";

interface SubscribeButtonProps {
  tier: PipelineTier;
  isCurrentTier: boolean;
}

/**
 * Subscribe button that opens xMoney checkout for the given tier.
 */
export function SubscribeButton({ tier, isCurrentTier }: SubscribeButtonProps): React.JSX.Element {
  const { subscribe, isLoading } = useSubscription();
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setError(null);
    try {
      await subscribe(tier);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    }
  }, [subscribe, tier]);

  if (isCurrentTier) {
    return (
      <button
        type="button"
        className="mt-6 w-full cursor-default rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        disabled
      >
        Current Plan
      </button>
    );
  }

  const isExplorer = tier === "explorer";
  const label = isExplorer ? "Free" : isLoading ? "Loading..." : "Subscribe";

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={isLoading || isExplorer}
        className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        data-testid={`subscribe-btn-${tier}`}
      >
        {label}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
