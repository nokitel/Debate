"use client";

import { useState } from "react";
import type { SSEEvent } from "@dialectical/shared";
import { useUIStore } from "@/stores/ui-store";
import { StageIndicator } from "./StageIndicator";
import { TournamentBracket } from "./TournamentBracket";
import { ConsensusScores } from "./ConsensusScores";
import { ProgressBar } from "../ui/ProgressBar";

/** All 9 pipeline stages in order. */
const STAGE_NAMES = [
  { key: "context-extraction", label: "Context Extraction" },
  { key: "strategy-selection", label: "Strategy Selection" },
  { key: "diverse-generation", label: "Diverse Generation" },
  { key: "tournament", label: "Tournament" },
  { key: "ensemble-consensus", label: "Ensemble Consensus" },
  { key: "semantic-dedup", label: "Semantic Dedup" },
  { key: "evidence-grounding", label: "Evidence Grounding" },
  { key: "adversarial-stress-test", label: "Adversarial Stress-Test" },
  { key: "final-refinement", label: "Final Refinement" },
] as const;

type StageStatus = "pending" | "running" | "completed" | "failed" | "skipped";

interface CandidateInfo {
  modelName: string;
  strategy: string;
  status: "pending" | "running" | "completed";
}

interface TournamentRound {
  winner: string;
  loser: string;
}

interface PipelineProgressProps {
  events?: SSEEvent[];
}

/**
 * Pipeline progress panel — slides in from the right.
 * Dark-themed to match the canvas aesthetic.
 * 360px wide, positioned fixed on the right side.
 */
export function PipelineProgress({ events = [] }: PipelineProgressProps): React.JSX.Element | null {
  const isVisible = useUIStore((s) => s.isPipelineVisible);
  const hidePipeline = useUIStore((s) => s.hidePipeline);
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
      candidates.push({
        modelName: event.modelName,
        strategy: event.strategy,
        status: "completed",
      });
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

  // Calculate progress
  const completedCount = Array.from(stageStates.values()).filter(
    (s) => s === "completed" || s === "skipped",
  ).length;
  const totalActive = STAGE_NAMES.filter(
    (s) => (stageStates.get(s.key) ?? "pending") !== "skipped",
  ).length;
  const progressPct = totalActive > 0 ? (completedCount / STAGE_NAMES.length) * 100 : 0;

  return (
    <div className="pipeline-enter fixed right-0 top-0 z-50 flex h-full w-[360px] flex-col border-l border-[var(--canvas-border)] bg-[var(--canvas-surface)] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--canvas-border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--canvas-text)]">Pipeline</h3>
        <button
          onClick={hidePipeline}
          className="text-[var(--canvas-text-sec)] hover:text-[var(--canvas-text)]"
          aria-label="Close pipeline"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
        </button>
      </div>

      {/* Stages list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-0.5">
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
                  <div className="ml-6 mt-1 space-y-0.5 border-l border-slate-700 pl-3">
                    {candidates.map((c, i) => (
                      <div key={`${c.modelName}-${i}`} className="flex items-center gap-2">
                        {c.status === "completed" ? (
                          <svg
                            viewBox="0 0 16 16"
                            className="h-3 w-3 text-green-400"
                            fill="currentColor"
                          >
                            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                          </svg>
                        ) : (
                          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--canvas-accent)]" />
                        )}
                        <span className="font-mono-data text-[11px] text-[var(--canvas-text-sec)]">
                          {c.modelName}
                        </span>
                        <span className="font-mono-data text-[10px] text-slate-600">
                          {c.strategy.slice(0, 4)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && stage.key === "tournament" && tournamentRounds.length > 0 && (
                  <div className="ml-6 mt-1 border-l border-slate-700 pl-3">
                    <TournamentBracket rounds={tournamentRounds} />
                  </div>
                )}

                {isExpanded && stage.key === "ensemble-consensus" && consensusScores && (
                  <div className="ml-6 mt-1 border-l border-slate-700 pl-3">
                    <ConsensusScores {...consensusScores} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar + stats */}
      <div className="border-t border-[var(--canvas-border)] px-4 py-3">
        <ProgressBar value={progressPct} />
        <p className="font-mono-data mt-2 text-xs text-[var(--canvas-text-sec)]">
          {candidates.length > 0
            ? `${candidates.length} candidates \u00B7 ${candidates.filter((c) => c.status === "completed").length} complete`
            : "Waiting for pipeline..."}
        </p>
      </div>
    </div>
  );
}
