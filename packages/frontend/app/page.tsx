import Link from "next/link";
import { Header } from "@/components/layout/Header";

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold">Dialectical Engine</h1>
        <p className="mt-4 text-lg text-[var(--color-text-secondary)]">
          Structured debate platform powered by AI. Create debates, generate arguments, and
          stress-test ideas.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/debates"
            className="rounded-md bg-[var(--color-thesis)] px-6 py-2.5 font-medium text-white hover:opacity-90"
          >
            Browse Debates
          </Link>
          <Link
            href="/debates/new"
            className="rounded-md border border-[var(--color-border)] px-6 py-2.5 font-medium hover:bg-[var(--color-bg-secondary)]"
          >
            Create Debate
          </Link>
        </div>
      </main>
    </>
  );
}
