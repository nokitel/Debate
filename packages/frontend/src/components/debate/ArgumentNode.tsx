"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { ArgumentNodeData } from "@/lib/dagre-layout";

/** Border + background classes by argument type. */
const TYPE_STYLES: Record<string, string> = {
  THESIS: "border-[var(--color-thesis)] bg-blue-50 dark:bg-blue-950/20",
  PRO: "border-[var(--color-pro)] bg-green-50 dark:bg-green-950/20",
  CON: "border-[var(--color-con)] bg-red-50 dark:bg-red-950/20",
};

/** Badge text label by type. */
const TYPE_LABELS: Record<string, string> = {
  THESIS: "Thesis",
  PRO: "Pro",
  CON: "Con",
};

/** Truncate text to maxLen characters with ellipsis. */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

/**
 * Custom React Flow node rendering an argument with type coloring,
 * truncated/expanded text, and metadata.
 */
function ArgumentNodeInner({ data }: NodeProps): React.JSX.Element {
  const { argument, expanded, childCount, hiddenCount } = data as ArgumentNodeData;
  const styleClass = TYPE_STYLES[argument.type] ?? "";
  const label = TYPE_LABELS[argument.type] ?? argument.type;
  const qualityPercent = Math.round(argument.qualityScore * 100);

  return (
    <div
      className={`w-[280px] rounded-md border-2 p-2 shadow-sm ${styleClass}`}
      data-testid={`tree-node-${argument.id}`}
      data-argument-type={argument.type}
    >
      {/* Target handle (incoming edge from parent) — not shown on THESIS */}
      {argument.type !== "THESIS" && (
        <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      )}

      {/* Header row: badge + source + quality */}
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase">{label}</span>
        <span className="text-[10px] text-[var(--color-text-secondary)]">
          {argument.source === "AI" ? argument.generatedBy : "User"}
        </span>
        <span className="ml-auto text-[10px] text-[var(--color-text-secondary)]">
          {qualityPercent}%
        </span>
      </div>

      {/* Argument text — truncated or full */}
      <p className="text-xs leading-snug">
        {expanded ? argument.text : truncate(argument.text, 80)}
      </p>

      {/* Expanded: show resilience + strategy */}
      {expanded && (
        <div className="mt-1.5 space-y-0.5">
          {argument.resilienceScore !== null && argument.resilienceScore !== undefined && (
            <p className="text-[10px] text-[var(--color-text-secondary)]">
              Resilience: {Math.round(argument.resilienceScore * 100)}%
            </p>
          )}
          <p className="text-[10px] text-[var(--color-text-secondary)]">
            Strategy: {argument.reasoningStrategy}
          </p>
        </div>
      )}

      {/* Collapsed subtree badge */}
      {hiddenCount > 0 && (
        <div className="mt-1 text-center text-[10px] font-medium text-[var(--color-text-secondary)]">
          +{hiddenCount} hidden
        </div>
      )}

      {/* Source handle (outgoing edge to children) */}
      {childCount > 0 && (
        <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
      )}
    </div>
  );
}

export const ArgumentNode = memo(ArgumentNodeInner);
