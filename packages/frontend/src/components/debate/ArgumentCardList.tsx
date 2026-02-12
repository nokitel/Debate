"use client";

import type { Argument } from "@dialectical/shared";
import { useDebateStore, getChildren, getThesis } from "@/stores/debate-store";
import { ArgumentCard } from "./ArgumentCard";

function ArgumentTree({
  argument,
  depth,
}: {
  argument: Argument;
  depth: number;
}): React.JSX.Element {
  const args = useDebateStore((s) => s.arguments);
  const children = getChildren(args, argument.id);

  return (
    <ArgumentCard argument={argument} depth={depth}>
      {children.map((child) => (
        <ArgumentTree key={child.id} argument={child} depth={depth + 1} />
      ))}
    </ArgumentCard>
  );
}

export function ArgumentCardList(): React.JSX.Element {
  const args = useDebateStore((s) => s.arguments);
  const isLoading = useDebateStore((s) => s.isLoading);
  const thesis = getThesis(args);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border-l-4 border-l-stone-300 bg-[var(--pub-surface)] p-6"
          >
            <div className="h-4 w-24 rounded bg-[var(--pub-section)]" />
            <div className="mt-3 h-4 w-3/4 rounded bg-[var(--pub-section)]" />
            <div className="mt-2 h-4 w-1/2 rounded bg-[var(--pub-section)]" />
          </div>
        ))}
      </div>
    );
  }

  if (!thesis) {
    return <p className="py-12 text-center text-[var(--pub-text-sec)]">No arguments found.</p>;
  }

  return (
    <div className="space-y-3">
      <ArgumentTree argument={thesis} depth={0} />
    </div>
  );
}
