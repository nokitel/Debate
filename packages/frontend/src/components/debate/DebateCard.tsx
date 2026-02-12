import Link from "next/link";
import type { Debate } from "@dialectical/shared";

interface DebateCardProps {
  debate: Debate & { createdByName?: string | null };
}

export function DebateCard({ debate }: DebateCardProps): React.JSX.Element {
  const creatorLabel = debate.createdByName ?? null;

  return (
    <Link
      href={`/debates/${debate.id}`}
      className="block rounded-xl border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 transition-colors hover:bg-[var(--pub-section)] sm:p-6"
    >
      <h3 className="font-serif-display text-base font-semibold leading-snug text-[var(--pub-text)] sm:text-lg">
        {debate.title}
      </h3>
      {debate.description && (
        <p className="mt-2 text-sm leading-relaxed text-[var(--pub-text-sec)]">
          {debate.description.length > 120
            ? `${debate.description.slice(0, 120)}...`
            : debate.description}
        </p>
      )}
      <div className="mt-3 flex items-center gap-3">
        <span className="font-mono-data text-xs text-[var(--pub-text-sec)]">
          {debate.totalNodes} arguments
        </span>
        <span className="text-xs text-[var(--pub-text-sec)]">&middot;</span>
        <span className="font-mono-data text-xs text-[var(--pub-text-sec)]">
          {new Date(debate.createdAt).toLocaleDateString()}
        </span>
        {creatorLabel && (
          <>
            <span className="text-xs text-[var(--pub-text-sec)]">&middot;</span>
            <span className="text-xs text-[var(--pub-text-sec)]">{creatorLabel}</span>
          </>
        )}
      </div>
    </Link>
  );
}
