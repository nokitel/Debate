"use client";

import type { Argument } from "@dialectical/shared";
import { useDebateStore, getChildren, getThesis } from "@/stores/debate-store";
import { ArgumentCard } from "./ArgumentCard";

function ArgumentTree({ argument }: { argument: Argument }): React.JSX.Element {
  const args = useDebateStore((s) => s.arguments);
  const children = getChildren(args, argument.id);

  return (
    <ArgumentCard argument={argument}>
      {children.map((child) => (
        <ArgumentTree key={child.id} argument={child} />
      ))}
    </ArgumentCard>
  );
}

export function ArgumentCardList(): React.JSX.Element {
  const args = useDebateStore((s) => s.arguments);
  const isLoading = useDebateStore((s) => s.isLoading);
  const thesis = getThesis(args);

  if (isLoading) {
    return <p className="text-center text-[var(--color-text-secondary)]">Loading arguments...</p>;
  }

  if (!thesis) {
    return <p className="text-center text-[var(--color-text-secondary)]">No arguments found.</p>;
  }

  return (
    <div className="space-y-2">
      <ArgumentTree argument={thesis} />
    </div>
  );
}
