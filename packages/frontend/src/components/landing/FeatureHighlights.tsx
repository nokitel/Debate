const FEATURES = [
  {
    title: "AI-Generated Arguments",
    description:
      "Multiple local LLMs generate diverse arguments using different reasoning strategies — consequentialist, deontological, virtue-based, and more.",
    icon: "brain",
    color: "var(--color-thesis)",
  },
  {
    title: "Adversarial Stress-Testing",
    description:
      "Every argument is challenged by a devil's advocate AI. Only resilient ideas survive the 9-stage pipeline.",
    icon: "shield",
    color: "var(--color-con)",
  },
  {
    title: "Blockchain Verified",
    description:
      "The strongest arguments are recorded on MultiversX, creating an immutable record of intellectual consensus.",
    icon: "chain",
    color: "var(--color-pro)",
  },
  {
    title: "Visual Argument Trees",
    description:
      "Explore debates as interactive tree graphs. See how arguments branch, connect, and support or oppose each other.",
    icon: "tree",
    color: "var(--color-thesis)",
  },
] as const;

const ICONS: Record<string, React.JSX.Element> = {
  brain: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-8 w-8"
    >
      <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 5.9L12 17l-3.7-2.1A7 7 0 0 1 5 9a7 7 0 0 1 7-7Z" />
      <path d="M12 17v5" />
      <path d="M9 9h.01M15 9h.01" />
    </svg>
  ),
  shield: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-8 w-8"
    >
      <path d="M12 2l8 4v6c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V6l8-4Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  chain: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-8 w-8"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  tree: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-8 w-8"
    >
      <path d="M12 3v18" />
      <path d="M5 8h14" />
      <path d="M8 14h8" />
      <circle cx="5" cy="8" r="2" />
      <circle cx="19" cy="8" r="2" />
      <circle cx="8" cy="14" r="2" />
      <circle cx="16" cy="14" r="2" />
    </svg>
  ),
};

export function FeatureHighlights(): React.JSX.Element {
  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-20">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center text-3xl font-bold">How It Works</h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-[var(--color-text-secondary)]">
          A 9-stage AI pipeline that generates, evaluates, and stress-tests arguments.
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6"
            >
              <div className="mb-4" style={{ color: feature.color }}>
                {ICONS[feature.icon]}
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
