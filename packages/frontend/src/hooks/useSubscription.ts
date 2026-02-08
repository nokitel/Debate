"use client";

import { useCallback } from "react";
import { trpc } from "@/lib/trpc";
import type { PipelineTier } from "@dialectical/shared";

/**
 * Hook for subscription state and actions.
 * Queries the backend for current subscription info and provides checkout/cancel actions.
 */
export function useSubscription(): {
  /** Current subscription info, loading/error states. */
  info: ReturnType<typeof trpc.subscription.getSubscriptionInfo.useQuery>;
  /** Initiate checkout for a tier. Redirects to xMoney. */
  subscribe: (tier: PipelineTier) => Promise<void>;
  /** Cancel the current subscription. */
  cancel: () => Promise<void>;
  /** Whether a checkout or cancel operation is in progress. */
  isLoading: boolean;
} {
  const info = trpc.subscription.getSubscriptionInfo.useQuery(undefined, {
    retry: false,
  });

  const createCheckout = trpc.subscription.createCheckout.useMutation();
  const cancelMutation = trpc.subscription.cancelSubscription.useMutation();

  const subscribe = useCallback(
    async (tier: PipelineTier) => {
      const result = await createCheckout.mutateAsync({ tier });
      // Redirect to xMoney checkout
      window.location.href = result.checkoutUrl;
    },
    [createCheckout],
  );

  const cancel = useCallback(async () => {
    await cancelMutation.mutateAsync();
    // Refetch subscription info
    await info.refetch();
  }, [cancelMutation, info]);

  return {
    info,
    subscribe,
    cancel,
    isLoading: createCheckout.isPending || cancelMutation.isPending,
  };
}
