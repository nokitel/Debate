"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type SortOption = "newest" | "oldest" | "most-arguments";

interface DebateFiltersProps {
  sort: SortOption;
  titleSearch: string;
  minArguments: number;
}

export function DebateFilters({
  sort,
  titleSearch,
  minArguments,
}: DebateFiltersProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/debates", { scroll: false });
    },
    [router, searchParams],
  );

  const inputClass =
    "rounded-lg border border-[var(--pub-border)] bg-[var(--pub-surface)] px-3 py-2 text-sm text-[var(--pub-text)] focus:border-[var(--pub-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--pub-accent)]/30";

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3" data-testid="debate-filters">
      <select
        value={sort}
        onChange={(e) =>
          updateParams({ sort: e.target.value === "newest" ? undefined : e.target.value })
        }
        className={inputClass}
        aria-label="Sort debates"
      >
        <option value="newest">Sort: Newest</option>
        <option value="oldest">Sort: Oldest</option>
        <option value="most-arguments">Sort: Most Arguments</option>
      </select>

      <input
        type="text"
        placeholder="Search debates..."
        defaultValue={titleSearch}
        onChange={(e) => updateParams({ search: e.target.value || undefined })}
        className={`${inputClass} min-w-[180px]`}
        aria-label="Search debate titles"
      />

      <label className="flex items-center gap-1.5 text-sm text-[var(--pub-text-sec)]">
        Min args:
        <input
          type="number"
          min={0}
          defaultValue={minArguments > 0 ? minArguments : ""}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            updateParams({ minArgs: val > 0 ? val.toString() : undefined });
          }}
          className={`w-16 ${inputClass}`}
          aria-label="Minimum arguments filter"
        />
      </label>
    </div>
  );
}
