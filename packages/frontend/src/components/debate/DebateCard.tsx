import Link from "next/link";
import type { Debate } from "@dialectical/shared";

interface DebateCardProps {
  debate: Debate;
}

export function DebateCard({ debate }: DebateCardProps): React.JSX.Element {
  return (
    <Link
      href={`/debates/${debate.id}`}
      className="block rounded-lg border border-[var(--color-border)] p-4 hover:bg-[var(--color-bg-secondary)]"
    >
      <h3 className="text-lg font-semibold">{debate.title}</h3>
      {debate.description && (
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{debate.description}</p>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
        <span>{debate.totalNodes} arguments</span>
        <span>{new Date(debate.createdAt).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}
