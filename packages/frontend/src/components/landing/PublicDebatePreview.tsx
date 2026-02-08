import Link from "next/link";

interface PopularDebate {
  id: string;
  title: string;
  totalNodes: number;
  description: string;
}

/**
 * Server component that shows the most popular public debate.
 * Fetches from the backend at render time (SSR).
 * Wrapped in Suspense by the parent so it doesn't block above-fold content.
 */
export async function PublicDebatePreview(): Promise<React.JSX.Element> {
  const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] ?? "http://localhost:4000";

  let debate: PopularDebate | null = null;
  try {
    const res = await fetch(
      `${backendUrl}/api/trpc/debate.getPopular?input=${encodeURIComponent(JSON.stringify({ limit: 1 }))}`,
      {
        next: { revalidate: 300 },
      },
    );
    if (res.ok) {
      const json = (await res.json()) as { result?: { data?: PopularDebate[] } };
      const debates = json.result?.data;
      if (debates && debates.length > 0) {
        debate = debates[0] ?? null;
      }
    }
  } catch {
    // Silently fail — preview is non-essential
  }

  if (!debate) {
    return (
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h2 className="text-2xl font-bold">Start the First Debate</h2>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Be the first to create a structured debate and let AI stress-test your ideas.
          </p>
          <Link
            href="/debates/new"
            className="mt-6 inline-block rounded-lg bg-[var(--color-thesis)] px-6 py-2.5 font-medium text-white hover:opacity-90"
          >
            Create Debate
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center text-2xl font-bold">Most Active Debate</h2>
        <Link
          href={`/debates/${debate.id}`}
          className="mx-auto mt-6 block max-w-xl rounded-xl border border-[var(--color-border)] p-6 hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <h3 className="text-xl font-semibold">{debate.title}</h3>
          {debate.description && (
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{debate.description}</p>
          )}
          <p className="mt-3 text-sm font-medium text-[var(--color-thesis)]">
            {debate.totalNodes} arguments &rarr;
          </p>
        </Link>
      </div>
    </section>
  );
}

/** Skeleton shown while PublicDebatePreview is loading via Suspense. */
export function PublicDebatePreviewSkeleton(): React.JSX.Element {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <div className="mx-auto h-8 w-64 animate-pulse rounded bg-[var(--color-bg-secondary)]" />
        <div className="mx-auto mt-6 h-32 max-w-xl animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]" />
      </div>
    </section>
  );
}
