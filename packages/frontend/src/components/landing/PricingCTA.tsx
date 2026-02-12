import Link from "next/link";

const TIERS = [
  {
    name: "Explorer",
    price: "Free",
    features: ["6-stage pipeline", "Local AI models", "10 arguments/month"],
    highlight: false,
  },
  {
    name: "Thinker",
    price: "\u20AC9.99/mo",
    features: [
      "7-stage pipeline",
      "+ Evidence grounding",
      "+ Source citations",
      "200 arguments/month",
    ],
    highlight: true,
  },
  {
    name: "Scholar",
    price: "\u20AC29.99/mo",
    features: [
      "All 9 stages",
      "+ Adversarial stress-test",
      "+ Final refinement",
      "1000 arguments/month",
    ],
    highlight: false,
  },
] as const;

export function PricingCTA(): React.JSX.Element {
  return (
    <section className="border-t border-[var(--pub-border)] bg-[var(--pub-section)] py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-serif-display text-center text-2xl font-semibold text-[var(--pub-text)] sm:text-3xl">
          Plans
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-[var(--pub-text-sec)]">
          Start free. Upgrade when you need deeper analysis and more arguments.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border bg-[var(--pub-surface)] p-6 ${
                tier.highlight
                  ? "border-[var(--pub-accent)] ring-2 ring-[var(--pub-accent)]/20"
                  : "border-[var(--pub-border)]"
              }`}
            >
              <h3 className="text-lg font-semibold text-[var(--pub-text)]">{tier.name}</h3>
              <p className="mt-1 text-2xl font-bold text-[var(--pub-text)]">{tier.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--pub-text-sec)]">
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
            className="text-sm font-medium text-[var(--pub-accent)] hover:underline"
          >
            Compare all plans &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
