"use client";

import { useUIStore } from "@/stores/ui-store";
import { StageIndicator } from "./StageIndicator";

interface StageState {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
}

/**
 * Pipeline progress panel.
 * Shows the current state of each pipeline stage during generation.
 * In Phase 1, only context-extraction and diverse-generation are active.
 */
export function PipelineProgress(): React.JSX.Element | null {
  const isVisible = useUIStore((s) => s.isPipelineVisible);

  if (!isVisible) return null;

  // Phase 1 minimal stages
  const stages: StageState[] = [
    { name: "Context Extraction", status: "running" },
    { name: "Generation", status: "pending" },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-40 w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-lg">
      <h3 className="mb-2 text-sm font-bold">AI Pipeline</h3>
      <div className="space-y-1">
        {stages.map((stage) => (
          <StageIndicator key={stage.name} name={stage.name} status={stage.status} />
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Generating argument...</p>
    </div>
  );
}
