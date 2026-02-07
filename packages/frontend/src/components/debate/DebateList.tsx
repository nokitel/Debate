"use client";

import { trpc } from "@/lib/trpc";
import { DebateCard } from "./DebateCard";

export function DebateList(): React.JSX.Element {
  const { data, isLoading, error } = trpc.debate.list.useQuery({ limit: 20 });

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
      {data.hasNext && (
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          More debates available...
        </p>
      )}
    </div>
  );
}
