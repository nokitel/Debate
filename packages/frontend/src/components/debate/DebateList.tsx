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
    return <p className="text-center text-[var(--color-text-secondary)]">Loading debates...</p>;
  }

  if (error) {
    return <p className="text-center text-[var(--color-con)]">Error: {error.message}</p>;
  }

  if (!data || data.debates.length === 0) {
    return (
      <p className="text-center text-[var(--color-text-secondary)]">
        No debates yet. Create one to get started!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.debates.map((debate) => (
        <DebateCard key={debate.id} debate={debate} />
      ))}
      {data.hasNext && data.nextCursor && (
        <div className="text-center">
          <button
            onClick={() => setCursor(data.nextCursor ?? undefined)}
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-bg-secondary)]"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
