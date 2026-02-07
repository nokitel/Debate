"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface CollapsibleRejectedProps {
  parentId: string;
  debateId: string;
}

/**
 * Collapsible section showing explored (rejected) arguments.
 * Lazy-loads via tRPC query when expanded.
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
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-[var(--color-text-secondary)] hover:underline"
        data-testid="toggle-explored"
      >
        {isOpen ? "Hide" : "Show"} explored arguments{count > 0 ? ` (${count})` : ""}
      </button>

      {isOpen && (
        <div className="mt-1 space-y-1">
          {isLoading && <p className="text-xs text-[var(--color-text-secondary)]">Loading...</p>}

          {data?.map((rejected) => (
            <div
              key={rejected.id}
              className="rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900"
              data-testid="rejected-argument"
            >
              <p className="text-xs">{rejected.text}</p>
              <div className="mt-1 flex gap-2 text-xs text-[var(--color-text-secondary)]">
                <span className="rounded bg-red-100 px-1 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {rejected.failedAtStage}
                </span>
                <span>{rejected.rejectionReason}</span>
              </div>
            </div>
          ))}

          {data && data.length === 0 && (
            <p className="text-xs text-[var(--color-text-secondary)]">No explored arguments yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
