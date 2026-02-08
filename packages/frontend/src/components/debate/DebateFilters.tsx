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

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3" data-testid="debate-filters">
      <select
        value={sort}
        onChange={(e) =>
          updateParams({ sort: e.target.value === "newest" ? undefined : e.target.value })
        }
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm"
        aria-label="Sort debates"
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="most-arguments">Most Arguments</option>
      </select>

      <input
        type="text"
        placeholder="Search titles..."
        defaultValue={titleSearch}
        onChange={(e) => updateParams({ search: e.target.value || undefined })}
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm"
        aria-label="Search debate titles"
      />

      <label className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
        Min args:
        <input
          type="number"
          min={0}
          defaultValue={minArguments > 0 ? minArguments : ""}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            updateParams({ minArgs: val > 0 ? val.toString() : undefined });
          }}
          className="w-16 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm"
          aria-label="Minimum arguments filter"
        />
      </label>
    </div>
  );
}
