import { TIER_CONFIGS } from "@dialectical/shared";
import type { PipelineTier } from "@dialectical/shared";
import { Navbar } from "@/components/layout/Navbar";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { TierCard } from "@/components/pricing/TierCard";
import { FeatureMatrix } from "@/components/pricing/FeatureMatrix";
import { Footer } from "@/components/landing/Footer";

const TIER_ORDER: PipelineTier[] = ["explorer", "thinker", "scholar", "institution"];

/**
 * Pricing page — warm public theme.
 * Displays 4 tier columns read from TIER_CONFIGS (shared package).
 */
export default function PricingPage(): React.JSX.Element {
  // TODO(P5.PAY.01): Read current user tier from session
  const currentTier: PipelineTier = "explorer";

  return (
    <PublicLayout>
      <Navbar variant="warm" />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8" data-testid="pricing-page">
        <div className="mb-10 text-center">
          <h1 className="font-serif-display text-3xl font-bold text-[var(--pub-text)]">
            Choose Your Plan
          </h1>
          <p className="mt-3 text-[var(--pub-text-sec)]">
            From free local AI to cloud-powered adversarial testing
          </p>
        </div>

        <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
          <h2 className="font-serif-display mb-6 text-xl font-semibold text-[var(--pub-text)]">
            Feature Comparison
          </h2>
          <FeatureMatrix />
        </div>
      </main>
      <Footer />
    </PublicLayout>
  );
}
