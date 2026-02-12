import Link from "next/link";

export function HeroSection(): React.JSX.Element {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
      <h1 className="font-serif-display text-[40px] font-bold leading-[48px] tracking-[-0.02em] text-[var(--pub-text)] sm:text-[52px] sm:leading-[60px]">
        Every idea deserves
        <br />a worthy opponent.
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--pub-text-sec)]">
        Seven AI models generate arguments. They compete. Only the strongest survive.
      </p>
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/debates/new"
          className="inline-flex items-center rounded-lg bg-[var(--pub-accent)] px-8 py-3 text-lg font-medium text-white transition-colors hover:bg-[var(--pub-accent-hover)]"
        >
          Start Your Debate
          <span className="ml-2">&rarr;</span>
        </Link>
        <a
          href="#how-it-works"
          className="inline-flex items-center rounded-lg px-8 py-3 text-lg font-medium text-[var(--pub-text-sec)] transition-colors hover:bg-[var(--pub-section)]"
        >
          See How It Works
          <span className="ml-2">&darr;</span>
        </a>
      </div>
    </section>
  );
}
