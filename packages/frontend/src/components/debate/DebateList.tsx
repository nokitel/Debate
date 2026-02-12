"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DebateCard } from "./DebateCard";

type SortOption = "newest" | "oldest" | "most-arguments";

interface DebateListProps {
  sort?: SortOption;
  titleSearch?: string;
  minArguments?: number;
}

export function DebateList({
  sort = "newest",
  titleSearch = "",
  minArguments = 0,
}: DebateListProps): React.JSX.Element {
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data, isLoading, error } = trpc.debate.list.useQuery({
    limit: 20,
    cursor,
    sort,
    titleSearch: titleSearch || undefined,
    minArguments: minArguments > 0 ? minArguments : undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[var(--pub-border)] bg-[var(--pub-surface)] p-6"
          >
            <div className="h-5 w-3/4 rounded bg-[var(--pub-section)]" />
            <div className="mt-3 h-4 w-1/2 rounded bg-[var(--pub-section)]" />
            <div className="mt-3 h-3 w-1/3 rounded bg-[var(--pub-section)]" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-[var(--color-con)]">Error: {error.message}</p>;
  }

  if (!data || data.debates.length === 0) {
    return (
      <p className="py-12 text-center text-[var(--pub-text-sec)]">
        No debates yet. Create one to get started!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {data.debates.map((debate) => (
        <DebateCard key={debate.id} debate={debate} />
      ))}
      {data.hasNext && data.nextCursor && (
        <div className="pt-4 text-center">
          <button
            onClick={() => setCursor(data.nextCursor ?? undefined)}
            className="rounded-lg border border-[var(--pub-border)] bg-[var(--pub-surface)] px-6 py-2.5 text-sm font-medium text-[var(--pub-text)] transition-colors hover:bg-[var(--pub-section)]"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
