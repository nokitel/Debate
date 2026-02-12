import Link from "next/link";

interface PopularDebate {
  id: string;
  title: string;
  totalNodes: number;
  description: string;
  createdAt: string;
  createdBy?: string;
  createdByName?: string | null;
}

interface PreviewArgument {
  type: "THESIS" | "PRO" | "CON";
  text: string;
  qualityScore: number;
}

const TYPE_BAR_COLORS: Record<string, string> = {
  THESIS: "border-l-[var(--color-thesis)]",
  PRO: "border-l-[var(--color-pro)]",
  CON: "border-l-[var(--color-con)]",
};

const TYPE_LABELS: Record<string, string> = {
  THESIS: "THESIS",
  PRO: "SUPPORTING",
  CON: "CHALLENGING",
};

/**
 * Server component showing a featured public debate with sample arguments.
 */
export async function PublicDebatePreview(): Promise<React.JSX.Element> {
  const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] ?? "http://localhost:4000";

  let debate: PopularDebate | null = null;
  const previewArgs: PreviewArgument[] = [];

  try {
    const res = await fetch(
      `${backendUrl}/api/trpc/debate.getPopular?input=${encodeURIComponent(JSON.stringify({ limit: 1 }))}`,
      { next: { revalidate: 300 } },
    );
    if (res.ok) {
      const json = (await res.json()) as { result?: { data?: PopularDebate[] } };
      const debates = json.result?.data;
      if (debates && debates.length > 0) {
        debate = debates[0] ?? null;
      }
    }
  } catch {
    // Non-essential preview
  }

  // Try to fetch a few arguments for the preview
  if (debate) {
    try {
      const res = await fetch(
        `${backendUrl}/api/trpc/debate.getTree?input=${encodeURIComponent(JSON.stringify({ debateId: debate.id }))}`,
        { next: { revalidate: 300 } },
      );
      if (res.ok) {
        const json = (await res.json()) as {
          result?: { data?: Array<{ type: string; text: string; qualityScore: number }> };
        };
        const args = json.result?.data;
        if (args && args.length > 0) {
          // Take thesis + first pro + first con
          const thesis = args.find((a) => a.type === "THESIS");
          const pro = args.find((a) => a.type === "PRO");
          const con = args.find((a) => a.type === "CON");
          if (thesis)
            previewArgs.push({
              type: "THESIS",
              text: thesis.text,
              qualityScore: thesis.qualityScore,
            });
          if (pro)
            previewArgs.push({ type: "PRO", text: pro.text, qualityScore: pro.qualityScore });
          if (con)
            previewArgs.push({ type: "CON", text: con.text, qualityScore: con.qualityScore });
        }
      }
    } catch {
      // Non-essential
    }
  }

  if (!debate) {
    return (
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-serif-display text-2xl font-semibold text-[var(--pub-text)]">
            Start the First Debate
          </h2>
          <p className="mt-2 text-[var(--pub-text-sec)]">
            Be the first to create a structured debate and let AI stress-test your ideas.
          </p>
          <Link
            href="/debates/new"
            className="mt-6 inline-block rounded-lg bg-[var(--pub-accent)] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[var(--pub-accent-hover)]"
          >
            Create Debate
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-serif-display text-center text-2xl font-semibold text-[var(--pub-text)]">
          Featured Debate
        </h2>
        <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-[var(--pub-border)] bg-[var(--pub-surface)] p-6 sm:p-8">
          <h3 className="font-serif-display text-xl font-semibold leading-snug text-[var(--pub-text)] sm:text-2xl">
            &ldquo;{debate.title}&rdquo;
          </h3>
          <p className="font-mono-data mt-2 text-xs text-[var(--pub-text-sec)]">
            {debate.createdByName ?? "Community"} &middot; {debate.totalNodes} arguments &middot;{" "}
            {new Date(debate.createdAt).toLocaleDateString()}
          </p>

          {previewArgs.length > 0 && (
            <div className="mt-6 space-y-3">
              {previewArgs.map((arg) => (
                <div
                  key={`${arg.type}-${arg.qualityScore}`}
                  className={`rounded-lg border-l-4 ${TYPE_BAR_COLORS[arg.type]} bg-[var(--pub-bg)] p-4`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--pub-text-sec)]">
                      {TYPE_LABELS[arg.type]}
                    </span>
                    <span className="font-mono-data text-xs text-[var(--pub-text-sec)]">
                      Quality: {Math.round(arg.qualityScore * 100)}%
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--pub-text)]">
                    &ldquo;{arg.text.length > 200 ? `${arg.text.slice(0, 200)}...` : arg.text}
                    &rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <Link
              href={`/debates/${debate.id}`}
              className="text-sm font-medium text-[var(--pub-accent)] hover:underline"
            >
              Read full debate &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Skeleton shown while PublicDebatePreview is loading via Suspense. */
export function PublicDebatePreviewSkeleton(): React.JSX.Element {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mx-auto h-8 w-48 animate-pulse rounded bg-[var(--pub-section)]" />
        <div className="mx-auto mt-8 max-w-3xl animate-pulse rounded-xl border border-[var(--pub-border)] bg-[var(--pub-surface)] p-8">
          <div className="h-6 w-3/4 rounded bg-[var(--pub-section)]" />
          <div className="mt-3 h-4 w-1/3 rounded bg-[var(--pub-section)]" />
          <div className="mt-6 space-y-3">
            <div className="h-20 rounded-lg bg-[var(--pub-section)]" />
            <div className="h-16 rounded-lg bg-[var(--pub-section)]" />
            <div className="h-16 rounded-lg bg-[var(--pub-section)]" />
          </div>
        </div>
      </div>
    </section>
  );
}
