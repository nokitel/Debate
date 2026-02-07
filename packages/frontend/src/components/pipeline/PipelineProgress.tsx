"use client";

import { useState } from "react";
import type { SSEEvent } from "@dialectical/shared";
import { useUIStore } from "@/stores/ui-store";
import { StageIndicator } from "./StageIndicator";
import { TournamentBracket } from "./TournamentBracket";
import { ConsensusScores } from "./ConsensusScores";

/** All 6 explorer-tier stages in order. */
const STAGE_NAMES = [
  { key: "context-extraction", label: "Context Extraction" },
  { key: "strategy-selection", label: "Strategy Selection" },
  { key: "diverse-generation", label: "Diverse Generation" },
  { key: "tournament", label: "Tournament" },
  { key: "ensemble-consensus", label: "Ensemble Consensus" },
  { key: "semantic-dedup", label: "Semantic Dedup" },
] as const;

type StageStatus = "pending" | "running" | "completed" | "failed" | "skipped";

interface CandidateInfo {
  modelName: string;
  strategy: string;
}

interface TournamentRound {
  winner: string;
  loser: string;
}

interface PipelineProgressProps {
  events?: SSEEvent[];
}

/**
 * Pipeline progress panel.
 * Shows the current state of each pipeline stage during generation.
 * SSE-driven: derives stage states from events.
 */
export function PipelineProgress({ events = [] }: PipelineProgressProps): React.JSX.Element | null {
  const isVisible = useUIStore((s) => s.isPipelineVisible);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  if (!isVisible) return null;

  // Derive stage states from events
  const stageStates = new Map<string, StageStatus>();
  const candidates: CandidateInfo[] = [];
  const tournamentRounds: TournamentRound[] = [];
  let consensusScores: { novelty: number; relevance: number; logicalStrength: number } | null =
    null;

  for (const event of events) {
    if (event.type === "stage-start") {
      stageStates.set(event.stage, "running");
    } else if (event.type === "stage-complete") {
      stageStates.set(event.stage, "completed");
    } else if (event.type === "stage-failed") {
      stageStates.set(event.stage, "failed");
    } else if (event.type === "candidate-generated") {
      candidates.push({ modelName: event.modelName, strategy: event.strategy });
    } else if (event.type === "tournament-round") {
      tournamentRounds.push({ winner: event.winner, loser: event.loser });
    } else if (event.type === "pipeline-complete" && event.result.argument) {
      const arg = event.result.argument as Record<string, unknown>;
      if (arg["qualityScore"] !== undefined) {
        const qs = Number(arg["qualityScore"]);
        consensusScores = { novelty: qs, relevance: qs, logicalStrength: qs };
      }
    }
  }

  const advancedCount = candidates.length > 3 ? 3 : candidates.length;
  const eliminatedCount = candidates.length > 3 ? candidates.length - 3 : 0;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-72 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-lg">
      <h3 className="mb-2 text-sm font-bold">AI Pipeline (6 stages)</h3>
      <div className="space-y-1">
        {STAGE_NAMES.map((stage) => {
          const status = stageStates.get(stage.key) ?? ("pending" as StageStatus);
          const isExpanded = expandedStage === stage.key;

          return (
            <div key={stage.key}>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
              >
                <StageIndicator name={stage.label} status={status} />
              </button>

              {isExpanded && stage.key === "diverse-generation" && candidates.length > 0 && (
                <div className="ml-2 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-2">
                  {candidates.map((c, i) => (
                    <div
                      key={`${c.modelName}-${i}`}
                      className="text-xs text-[var(--color-text-secondary)]"
                    >
                      {c.modelName} ({c.strategy})
                    </div>
                  ))}
                </div>
              )}

              {isExpanded && stage.key === "tournament" && tournamentRounds.length > 0 && (
                <div className="ml-2 mt-1 border-l-2 border-gray-200 pl-2">
                  <TournamentBracket rounds={tournamentRounds} />
                </div>
              )}

              {isExpanded && stage.key === "ensemble-consensus" && consensusScores && (
                <div className="ml-2 mt-1 border-l-2 border-gray-200 pl-2">
                  <ConsensusScores {...consensusScores} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {candidates.length > 0 && (
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          {advancedCount} advanced, {eliminatedCount} eliminated
        </p>
      )}
    </div>
  );
}
