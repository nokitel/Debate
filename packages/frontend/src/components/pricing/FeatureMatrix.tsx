import { TIER_CONFIGS } from "@dialectical/shared";
import type { PipelineTier } from "@dialectical/shared";

const TIER_NAMES: PipelineTier[] = ["explorer", "thinker", "scholar", "institution"];
const TIER_DISPLAY: Record<PipelineTier, string> = {
  explorer: "Explorer",
  thinker: "Thinker",
  scholar: "Scholar",
  institution: "Institution",
};

interface FeatureRow {
  label: string;
  getValue: (tier: PipelineTier) => string;
}

const FEATURE_ROWS: FeatureRow[] = [
  {
    label: "Price",
    getValue: (tier) => {
      const config = TIER_CONFIGS[tier];
      return config.priceEur === 0 ? "Free" : `\u20AC${config.priceEur}/mo`;
    },
  },
  {
    label: "Arguments / month",
    getValue: (tier) => {
      const config = TIER_CONFIGS[tier];
      return config.maxArgumentsPerMonth === Infinity
        ? "Unlimited"
        : String(config.maxArgumentsPerMonth);
    },
  },
  {
    label: "Pipeline stages",
    getValue: (tier) => String(TIER_CONFIGS[tier].enabledStages.length),
  },
  {
    label: "Web search",
    getValue: (tier) => (TIER_CONFIGS[tier].enableWebSearch ? "Yes" : "No"),
  },
  {
    label: "Adversarial stress-test",
    getValue: (tier) => (TIER_CONFIGS[tier].enableAdversarial ? "Yes" : "No"),
  },
  {
    label: "Source citations",
    getValue: (tier) => (TIER_CONFIGS[tier].enableCitations ? "Yes" : "No"),
  },
  {
    label: "Cloud models",
    getValue: (tier) => {
      const config = TIER_CONFIGS[tier];
      if (!config.cloudModels) return "None (local only)";
      const models = [...new Set(Object.values(config.cloudModels))];
      return models.map((m) => m.replace("claude-", "").split("-")[0]).join(", ");
    },
  },
];

/**
 * Feature comparison table — warm public theme.
 * Reads values from TIER_CONFIGS (not hardcoded).
 */
export function FeatureMatrix(): React.JSX.Element {
  return (
    <div
      className="overflow-x-auto rounded-xl border border-[var(--pub-border)]"
      data-testid="feature-matrix"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--pub-border)] bg-[var(--pub-section)]">
            <th className="px-4 py-3 text-left font-medium text-[var(--pub-text-sec)]">Feature</th>
            {TIER_NAMES.map((tier) => (
              <th key={tier} className="px-4 py-3 text-center font-semibold text-[var(--pub-text)]">
                {TIER_DISPLAY[tier]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_ROWS.map((row) => (
            <tr key={row.label} className="border-b border-[var(--pub-border)]">
              <td className="px-4 py-3 text-[var(--pub-text-sec)]">{row.label}</td>
              {TIER_NAMES.map((tier) => (
                <td key={tier} className="px-4 py-3 text-center text-[var(--pub-text)]">
                  {row.getValue(tier)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
