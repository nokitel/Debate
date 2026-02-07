import { TIER_CONFIGS } from "@dialectical/shared";
import type { PipelineTier } from "@dialectical/shared";
import { TierCard } from "@/components/pricing/TierCard";
import { FeatureMatrix } from "@/components/pricing/FeatureMatrix";

const TIER_ORDER: PipelineTier[] = ["explorer", "thinker", "scholar", "institution"];

/**
 * Pricing page — SSR server component.
 * Displays 4 tier columns read from TIER_CONFIGS (shared package).
 */
export default function PricingPage(): React.JSX.Element {
  // TODO(P5.PAY.01): Read current user tier from session
  const currentTier: PipelineTier = "explorer";

  return (
    <main className="mx-auto max-w-6xl px-4 py-12" data-testid="pricing-page">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          From free local AI to cloud-powered adversarial testing
        </p>
      </div>

      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {TIER_ORDER.map((tier) => (
          <TierCard
            key={tier}
            name={tier}
            config={TIER_CONFIGS[tier]}
            isCurrentTier={tier === currentTier}
          />
        ))}
      </div>

      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-xl font-bold">Feature Comparison</h2>
        <FeatureMatrix />
      </div>
    </main>
  );
}
