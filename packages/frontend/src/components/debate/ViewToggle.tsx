"use client";

import { useUIStore } from "@/stores/ui-store";

/**
 * Segmented toggle to switch between Cards and Tree views.
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
      className="inline-flex rounded-md border border-gray-300 dark:border-gray-600"
      data-testid="view-toggle"
    >
      <button
        type="button"
        className={`px-3 py-1.5 text-sm font-medium transition-colors ${
          viewMode === "cards"
            ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        } rounded-l-md`}
        aria-pressed={viewMode === "cards"}
        onClick={() => handleClick("cards")}
        data-testid="view-toggle-cards"
      >
        Cards
      </button>
      <button
        type="button"
        className={`px-3 py-1.5 text-sm font-medium transition-colors ${
          viewMode === "tree"
            ? "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        } rounded-r-md`}
        aria-pressed={viewMode === "tree"}
        onClick={() => handleClick("tree")}
        data-testid="view-toggle-tree"
      >
        Tree
      </button>
    </div>
  );
}
