import type { TierConfig, PipelineTier } from "@dialectical/shared";
import { SubscribeButton } from "./SubscribeButton";

interface TierCardProps {
  name: string;
  config: TierConfig;
  isCurrentTier: boolean;
}

const TIER_DISPLAY_NAMES: Record<string, string> = {
  explorer: "Explorer",
  thinker: "Thinker",
  scholar: "Scholar",
  institution: "Institution",
};

const TIER_DESCRIPTIONS: Record<string, string> = {
  explorer: "Free forever. Local AI models, 6-stage pipeline.",
  thinker: "Web-grounded arguments with evidence citations.",
  scholar: "Full adversarial testing + refinement with Claude.",
  institution: "Unlimited power. Claude Sonnet for everything.",
};

/**
 * Individual tier pricing card — warm public theme.
 */
export function TierCard({ name, config, isCurrentTier }: TierCardProps): React.JSX.Element {
  const displayName = TIER_DISPLAY_NAMES[name] ?? name;
  const description = TIER_DESCRIPTIONS[name] ?? "";
  const priceLabel = config.priceEur === 0 ? "Free" : `\u20AC${config.priceEur}/mo`;
  const stageCount = config.enabledStages.length;

  const features: string[] = [
    `${stageCount} pipeline stages`,
    config.maxArgumentsPerMonth === Infinity
      ? "Unlimited arguments"
      : `${config.maxArgumentsPerMonth} arguments/month`,
  ];

  if (config.enableWebSearch) features.push("Web search & evidence");
  if (config.enableAdversarial) features.push("Adversarial stress-test");
  if (config.enableCitations) features.push("Source citations");
  if (config.cloudModels) {
    const models = Object.values(config.cloudModels);
    const hassonnet = models.some((m) => m.includes("sonnet"));
    features.push(hassonnet ? "Claude Sonnet" : "Claude Haiku");
  }

  const isHighlighted = name === "thinker";

  return (
    <div
      className={`flex flex-col rounded-xl border bg-[var(--pub-surface)] p-6 ${
        isHighlighted
          ? "border-[var(--pub-accent)] ring-2 ring-[var(--pub-accent)]/20"
          : "border-[var(--pub-border)]"
      }`}
      data-testid={`tier-card-${name}`}
    >
      <h3 className="font-serif-display text-lg font-bold text-[var(--pub-text)]">{displayName}</h3>
      <p className="mt-1 text-sm text-[var(--pub-text-sec)]">{description}</p>

      <div className="my-4">
        <span className="text-3xl font-bold text-[var(--pub-text)]">{priceLabel}</span>
      </div>

      <ul className="flex-1 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-[var(--pub-text)]">
            <span className="text-[var(--color-pro)]">&#10003;</span>
            {feature}
          </li>
        ))}
      </ul>

      <SubscribeButton tier={name as PipelineTier} isCurrentTier={isCurrentTier} />
    </div>
  );
}
