"use client";

import type { Argument } from "@dialectical/shared";
import { GenerateButton } from "./GenerateButton";
import { WriteArgumentButton } from "./WriteArgumentButton";
import { CollapsibleRejected } from "./CollapsibleRejected";
import { SourceCitation } from "./SourceCitation";

interface ArgumentCardProps {
  argument: Argument;
  children?: React.ReactNode;
  depth?: number;
}

const TYPE_BAR_COLORS: Record<string, string> = {
  THESIS: "border-l-[var(--color-thesis)]",
  PRO: "border-l-[var(--color-pro)]",
  CON: "border-l-[var(--color-con)]",
};

const TYPE_LABELS: Record<string, string> = {
  THESIS: "Thesis",
  PRO: "Supporting",
  CON: "Challenging",
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  THESIS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  PRO: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CON: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

/**
 * Get the score bar gradient class by value.
 */
function getScoreGradient(score: number): string {
  if (score >= 0.7) return "score-gradient-green";
  if (score >= 0.4) return "score-gradient-amber";
  return "score-gradient-red";
}

/**
 * Warm-themed argument card for Reading mode.
 * Uses "Supporting" / "Challenging" labels, 4px colored left border,
 * generous spacing and readable typography.
 */
export function ArgumentCard({
  argument,
  children,
  depth = 0,
}: ArgumentCardProps): React.JSX.Element {
  const barColor = TYPE_BAR_COLORS[argument.type] ?? "";
  const label = TYPE_LABELS[argument.type] ?? argument.type;
  const badgeStyle = TYPE_BADGE_STYLES[argument.type] ?? "";
  const qualityPct = Math.round(argument.qualityScore * 100);
  const resiliencePct =
    argument.resilienceScore !== null && argument.resilienceScore !== undefined
      ? Math.round(argument.resilienceScore * 100)
      : null;

  return (
    <div
      className={`rounded-xl border-l-4 ${barColor} bg-[var(--pub-surface)] p-5 sm:p-6`}
      data-argument-id={argument.id}
      style={{ marginLeft: depth > 0 ? `${Math.min(depth * 24, 72)}px` : undefined }}
    >
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase ${badgeStyle}`}>
          {label}
        </span>
        <span className="font-mono-data text-xs text-[var(--pub-text-sec)]">
          {argument.source === "AI" ? `AI (${argument.generatedBy})` : "User"}
        </span>
        {argument.reasoningStrategy && (
          <>
            <span className="text-xs text-[var(--pub-text-sec)]">&middot;</span>
            <span className="font-mono-data text-xs text-[var(--pub-text-sec)]">
              {argument.reasoningStrategy}
            </span>
          </>
        )}
      </div>

      {/* Argument text */}
      <p className="text-[15px] leading-[26px] text-[var(--pub-text)]">{argument.text}</p>

      {/* Score bars */}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono-data text-xs text-[var(--pub-text-sec)]">
            Quality {qualityPct}%
          </span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
            <div
              className={`h-full rounded-full ${getScoreGradient(argument.qualityScore)}`}
              style={{ width: `${qualityPct}%` }}
            />
          </div>
        </div>
        {resiliencePct !== null && (
          <div className="flex items-center gap-2">
            <span
              className="font-mono-data text-xs text-[var(--pub-text-sec)]"
              data-testid="resilience-score"
            >
              Resilience {resiliencePct}%
            </span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
              <div
                className={`h-full rounded-full ${getScoreGradient(argument.resilienceScore ?? 0)}`}
                style={{ width: `${resiliencePct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sources */}
      <SourceCitation argument={argument} />

      {/* Generate & Write buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        <GenerateButton parentId={argument.id} debateId={argument.debateId} type="PRO" />
        <GenerateButton parentId={argument.id} debateId={argument.debateId} type="CON" />
        <WriteArgumentButton parentId={argument.id} debateId={argument.debateId} type="PRO" />
        <WriteArgumentButton parentId={argument.id} debateId={argument.debateId} type="CON" />
      </div>

      <CollapsibleRejected parentId={argument.id} debateId={argument.debateId} />

      {/* Children (nested arguments) */}
      {children && <div className="mt-4 space-y-3">{children}</div>}
    </div>
  );
}
