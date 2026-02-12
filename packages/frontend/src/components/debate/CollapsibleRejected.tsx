"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface CollapsibleRejectedProps {
  parentId: string;
  debateId: string;
}

/**
 * Collapsible section showing explored (rejected) arguments.
 * Lazy-loads via tRPC query when expanded. Warm-themed.
 */
export function CollapsibleRejected({
  parentId,
  debateId,
}: CollapsibleRejectedProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = trpc.argument.getRejected.useQuery(
    { debateId, parentId },
    { enabled: isOpen },
  );

  const count = data?.length ?? 0;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-[var(--pub-text-sec)] hover:text-[var(--pub-text)] transition-colors"
        data-testid="toggle-explored"
      >
        {isOpen ? "Hide" : "Show"} explored arguments{count > 0 ? ` (${count})` : ""}
      </button>

      {isOpen && (
        <div className="mt-2 space-y-2">
          {isLoading && <p className="text-xs text-[var(--pub-text-sec)]">Loading...</p>}

          {data?.map((rejected) => (
            <div
              key={rejected.id}
              className="rounded-lg border border-[var(--pub-border)] bg-[var(--pub-section)] p-3"
              data-testid="rejected-argument"
            >
              <p className="text-xs text-[var(--pub-text)]">{rejected.text}</p>
              <div className="mt-1.5 flex gap-2 text-xs">
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {rejected.failedAtStage}
                </span>
                <span className="text-[var(--pub-text-sec)]">{rejected.rejectionReason}</span>
              </div>
            </div>
          ))}

          {data && data.length === 0 && (
            <p className="text-xs text-[var(--pub-text-sec)]">No explored arguments yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
