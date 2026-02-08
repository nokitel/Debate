import Link from "next/link";

export function HeroSection(): React.JSX.Element {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 text-center">
      <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
        Structured Debate, <span className="text-[var(--color-thesis)]">Powered by AI</span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-text-secondary)]">
        Create debates, generate rigorous arguments with AI agents, stress-test ideas through
        adversarial reasoning, and record the strongest ones on-chain.
      </p>
      <div className="mt-10 flex justify-center gap-4">
        <Link
          href="/debates"
          className="rounded-lg bg-[var(--color-thesis)] px-8 py-3 text-lg font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Browse Debates
        </Link>
        <Link
          href="/debates/new"
          className="rounded-lg border-2 border-[var(--color-border)] px-8 py-3 text-lg font-semibold hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          Create a Debate
        </Link>
      </div>
    </section>
  );
}
