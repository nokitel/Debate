import Link from "next/link";

const TIERS = [
  {
    name: "Explorer",
    price: "Free",
    features: ["10 arguments/month", "1 local model", "Basic pipeline"],
    highlight: false,
  },
  {
    name: "Thinker",
    price: "$9/mo",
    features: [
      "200 arguments/month",
      "3 models + cloud",
      "Citations & evidence",
      "On-chain recording",
    ],
    highlight: true,
  },
  {
    name: "Scholar",
    price: "$29/mo",
    features: [
      "1000 arguments/month",
      "All models + premium cloud",
      "Full pipeline",
      "Priority generation",
    ],
    highlight: false,
  },
] as const;

export function PricingCTA(): React.JSX.Element {
  return (
    <section className="border-t border-[var(--color-border)] py-20">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center text-3xl font-bold">Choose Your Plan</h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-[var(--color-text-secondary)]">
          Start free. Upgrade when you need more arguments and deeper analysis.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-6 ${
                tier.highlight
                  ? "border-[var(--color-thesis)] ring-2 ring-[var(--color-thesis)]/20"
                  : "border-[var(--color-border)]"
              }`}
            >
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <p className="mt-1 text-2xl font-bold">{tier.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="text-[var(--color-pro)]">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="text-sm font-medium text-[var(--color-thesis)] hover:underline"
          >
            Compare all features &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
