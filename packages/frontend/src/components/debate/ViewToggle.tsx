"use client";

import { useUIStore } from "@/stores/ui-store";

/**
 * Segmented toggle to switch between Reading (warm) and Canvas (dark) views.
 * Syncs selection with Zustand state and the URL query parameter.
 */
export function ViewToggle(): React.JSX.Element {
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  function handleClick(mode: "cards" | "tree"): void {
    setViewMode(mode);
    const url = new URL(window.location.href);
    url.searchParams.set("view", mode);
    window.history.replaceState({}, "", url.toString());
  }

  return (
    <div
      className="inline-flex overflow-hidden rounded-lg border border-[var(--canvas-border)]"
      data-testid="view-toggle"
    >
      <button
        type="button"
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
          viewMode === "cards"
            ? "bg-[var(--canvas-accent)] text-white"
            : "text-[var(--canvas-text-sec)] hover:text-[var(--canvas-text)] hover:bg-[var(--canvas-surface-h)]"
        }`}
        aria-pressed={viewMode === "cards"}
        onClick={() => handleClick("cards")}
        data-testid="view-toggle-cards"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z" />
        </svg>
        Reading
      </button>
      <button
        type="button"
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
          viewMode === "tree"
            ? "bg-[var(--canvas-accent)] text-white"
            : "text-[var(--canvas-text-sec)] hover:text-[var(--canvas-text)] hover:bg-[var(--canvas-surface-h)]"
        }`}
        aria-pressed={viewMode === "tree"}
        onClick={() => handleClick("tree")}
        data-testid="view-toggle-tree"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path
            d="M8 1v6M4 7v4M12 7v4M8 7l-4 0M8 7l4 0M4 11h0M12 11h0M8 1h0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        Canvas
      </button>
    </div>
  );
}
