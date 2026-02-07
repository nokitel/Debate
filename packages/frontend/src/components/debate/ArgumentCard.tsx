"use client";

import type { Argument } from "@dialectical/shared";
import { GenerateButton } from "./GenerateButton";
import { CollapsibleRejected } from "./CollapsibleRejected";
import { SourceCitation } from "./SourceCitation";

interface ArgumentCardProps {
  argument: Argument;
  children?: React.ReactNode;
}

const TYPE_COLORS: Record<string, string> = {
  THESIS: "border-l-[var(--color-thesis)] bg-blue-50 dark:bg-blue-950/20",
  PRO: "border-l-[var(--color-pro)] bg-green-50 dark:bg-green-950/20",
  CON: "border-l-[var(--color-con)] bg-red-50 dark:bg-red-950/20",
};

const TYPE_LABELS: Record<string, string> = {
  THESIS: "Thesis",
  PRO: "Pro",
  CON: "Con",
};

/**
 * Get the CSS color class for a resilience score badge.
 */
function getResilienceColor(score: number): string {
  if (score >= 0.7) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (score >= 0.4)
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

export function ArgumentCard({ argument, children }: ArgumentCardProps): React.JSX.Element {
  const colorClass = TYPE_COLORS[argument.type] ?? "";
  const label = TYPE_LABELS[argument.type] ?? argument.type;

  return (
    <div className={`rounded-md border-l-4 p-3 ${colorClass}`} data-argument-id={argument.id}>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-bold uppercase">{label}</span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {argument.source === "AI" ? `AI (${argument.generatedBy})` : "User"}
        </span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {argument.reasoningStrategy}
        </span>
        {argument.resilienceScore !== null && argument.resilienceScore !== undefined && (
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${getResilienceColor(argument.resilienceScore)}`}
            data-testid="resilience-score"
          >
            Resilience: {Math.round(argument.resilienceScore * 100)}%
          </span>
        )}
      </div>
      <p className="text-sm">{argument.text}</p>
      <SourceCitation argument={argument} />
      <div className="mt-2 flex gap-2">
        <GenerateButton parentId={argument.id} debateId={argument.debateId} type="PRO" />
        <GenerateButton parentId={argument.id} debateId={argument.debateId} type="CON" />
      </div>
      <CollapsibleRejected parentId={argument.id} debateId={argument.debateId} />
      {children && <div className="ml-4 mt-3 space-y-2">{children}</div>}
    </div>
  );
}
