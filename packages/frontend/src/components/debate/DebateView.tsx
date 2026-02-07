"use client";

import { useEffect } from "react";
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

export function DebateView({ debateId }: DebateViewProps): React.JSX.Element {
  const setDebate = useDebateStore((s) => s.setDebate);
  const setArguments = useDebateStore((s) => s.setArguments);
  const setLoading = useDebateStore((s) => s.setLoading);
  const debate = useDebateStore((s) => s.debate);
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

  if (debateQuery.isLoading) {
    return <p className="text-center text-[var(--color-text-secondary)]">Loading debate...</p>;
  }

  if (debateQuery.error) {
    return (
      <p className="text-center text-[var(--color-con)]">Error: {debateQuery.error.message}</p>
    );
  }

  if (!debate) {
    return <p className="text-center text-[var(--color-text-secondary)]">Debate not found.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{debate.title}</h1>
          {debate.description && (
            <p className="text-[var(--color-text-secondary)]">{debate.description}</p>
          )}
        </div>
        <ViewToggle />
      </div>
      {viewMode === "cards" ? <ArgumentCardList /> : <ArgumentTreeGraph />}
      <PipelineProgress />
    </div>
  );
}
