"use client";

import { useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useDebateStore } from "@/stores/debate-store";
import { useUIStore } from "@/stores/ui-store";
import { ArgumentCardList } from "./ArgumentCardList";
import { ArgumentTreeGraph } from "./ArgumentTreeGraph";
import { ViewToggle } from "./ViewToggle";
import { PipelineProgress } from "../pipeline/PipelineProgress";

interface DebateViewProps {
  debateId: string;
}

/**
 * Main debate view component.
 * Switches between dark Canvas mode and warm Reading mode.
 * The parent page wraps with the appropriate layout based on viewMode.
 */
export function DebateView({ debateId }: DebateViewProps): React.JSX.Element {
  const setDebate = useDebateStore((s) => s.setDebate);
  const setArguments = useDebateStore((s) => s.setArguments);
  const setLoading = useDebateStore((s) => s.setLoading);
  const debate = useDebateStore((s) => s.debate);
  const args = useDebateStore((s) => s.arguments);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  const debateQuery = trpc.debate.getById.useQuery({ id: debateId });
  const treeQuery = trpc.debate.getTree.useQuery({ debateId });

  // Sync URL ?view= param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get("view");
    if (urlView === "tree" || urlView === "cards") {
      setViewMode(urlView);
    }
  }, [setViewMode]);

  useEffect(() => {
    setLoading(debateQuery.isLoading || treeQuery.isLoading);
  }, [debateQuery.isLoading, treeQuery.isLoading, setLoading]);

  useEffect(() => {
    if (debateQuery.data) {
      setDebate(debateQuery.data);
    }
  }, [debateQuery.data, setDebate]);

  useEffect(() => {
    if (treeQuery.data) {
      setArguments(treeQuery.data);
    }
  }, [treeQuery.data, setArguments]);

  const isCanvas = viewMode === "tree";

  if (debateQuery.isLoading) {
    return (
      <div
        className={`flex h-64 items-center justify-center ${isCanvas ? "text-[var(--canvas-text-sec)]" : "text-[var(--pub-text-sec)]"}`}
      >
        Loading debate...
      </div>
    );
  }

  if (debateQuery.error) {
    return (
      <p className="py-12 text-center text-[var(--color-con)]">
        Error: {debateQuery.error.message}
      </p>
    );
  }

  if (!debate) {
    return (
      <p
        className={`py-12 text-center ${isCanvas ? "text-[var(--canvas-text-sec)]" : "text-[var(--pub-text-sec)]"}`}
      >
        Debate not found.
      </p>
    );
  }

  const proCount = Array.from(args.values()).filter((a) => a.type === "PRO").length;
  const conCount = Array.from(args.values()).filter((a) => a.type === "CON").length;

  return (
    <div className={isCanvas ? "canvas-page" : "pub-page"}>
      {/* Debate header */}
      <div
        className={`border-b ${isCanvas ? "border-[var(--canvas-border)] bg-[var(--canvas-surface)]" : "border-[var(--pub-border)] bg-[var(--pub-surface)]"}`}
      >
        <div className="mx-auto flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/debates"
              className={`text-sm ${isCanvas ? "text-[var(--canvas-text-sec)] hover:text-[var(--canvas-text)]" : "text-[var(--pub-text-sec)] hover:text-[var(--pub-text)]"} transition-colors`}
            >
              &larr; All Debates
            </Link>
          </div>
          <ViewToggle />
        </div>
      </div>

      {/* Debate title area */}
      {isCanvas ? (
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="font-serif-display text-xl font-semibold text-[var(--canvas-text)] sm:text-2xl">
            &ldquo;{debate.title}&rdquo;
          </h1>
          <p className="font-mono-data mt-1 text-xs text-[var(--canvas-text-sec)]">
            {args.size} arguments &middot; depth{" "}
            {Math.max(0, ...Array.from(args.values()).map((a) => a.depthLevel))} &middot; {proCount}{" "}
            support &middot; {conCount} challenge
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-serif-display text-xl font-semibold text-[var(--pub-text)] sm:text-2xl">
            {debate.title}
          </h1>
          {debate.description && (
            <p className="mt-2 text-sm text-[var(--pub-text-sec)]">{debate.description}</p>
          )}
          <p className="font-mono-data mt-2 text-xs text-[var(--pub-text-sec)]">
            {args.size} arguments &middot; {new Date(debate.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Content area */}
      {isCanvas ? (
        <ArgumentTreeGraph />
      ) : (
        <div className="mx-auto max-w-3xl px-4 pb-12 sm:px-6 lg:px-8">
          <ArgumentCardList />
        </div>
      )}

      <PipelineProgress />
    </div>
  );
}
