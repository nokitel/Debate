const STEPS = [
  {
    number: "1",
    title: "Understand",
    description:
      "We read the full debate context and choose the best reasoning strategy — consequentialist, deontological, empirical, or more.",
    detail: "Stages 1\u20132",
  },
  {
    number: "2",
    title: "Compete",
    description:
      "7 models each write an argument using different strategies. They compete in an Elo tournament. A jury of 5 votes on the winner.",
    detail: "Stages 3\u20136",
  },
  {
    number: "3",
    title: "Verify",
    description:
      "Sources are checked, arguments stress-tested by a devil\u2019s advocate, refined for clarity, and the strongest is verified on-chain.",
    detail: "Stages 7\u20139",
  },
] as const;

export function FeatureHighlights(): React.JSX.Element {
  return (
    <section
      id="how-it-works"
      className="border-t border-[var(--pub-border)] bg-[var(--pub-section)] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-serif-display text-center text-2xl font-semibold text-[var(--pub-text)] sm:text-3xl">
          How the Engine Works
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="rounded-xl border border-[var(--pub-border)] bg-[var(--pub-surface)] p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--pub-accent)] font-serif-display text-lg font-bold text-white">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-[var(--pub-text)]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--pub-text-sec)]">
                {step.description}
              </p>
              <p className="font-mono-data mt-3 text-xs text-[var(--pub-text-sec)]">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm italic text-[var(--pub-text-sec)]">
          &ldquo;Only arguments that survive all stages are published.&rdquo;
        </p>
      </div>
    </section>
  );
}
