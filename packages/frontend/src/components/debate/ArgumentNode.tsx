"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { ArgumentNodeData } from "@/lib/dagre-layout";

/** Default style for unknown argument types. */
const DEFAULT_STYLE = {
  glow: "glow-thesis",
  border: "border-[var(--color-thesis)]",
  badge: "bg-blue-500/20 text-blue-300",
} as const;

/** Glow + border classes by argument type for canvas theme. */
const TYPE_STYLES: Record<string, { glow: string; border: string; badge: string }> = {
  THESIS: DEFAULT_STYLE,
  PRO: {
    glow: "glow-pro",
    border: "border-[var(--color-pro)]",
    badge: "bg-green-500/20 text-green-300",
  },
  CON: {
    glow: "glow-con",
    border: "border-[var(--color-con)]",
    badge: "bg-red-500/20 text-red-300",
  },
};

/** Badge label by type (short labels for tree nodes). */
const TYPE_LABELS: Record<string, string> = {
  THESIS: "T",
  PRO: "PRO",
  CON: "CON",
};

const TYPE_LABELS_LONG: Record<string, string> = {
  THESIS: "THESIS",
  PRO: "PRO",
  CON: "CON",
};

/** Truncate text to maxLen characters with ellipsis. */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "\u2026";
}

/**
 * Custom React Flow node for the dark canvas.
 * Features glow effects, compact layout, and quality/resilience scores.
 */
function ArgumentNodeInner({ data }: NodeProps): React.JSX.Element {
  const { argument, expanded, childCount, hiddenCount } = data as ArgumentNodeData;
  const styles = TYPE_STYLES[argument.type] ?? DEFAULT_STYLE;
  const badgeLabel = expanded
    ? (TYPE_LABELS_LONG[argument.type] ?? argument.type)
    : (TYPE_LABELS[argument.type] ?? argument.type);
  const qualityPercent = Math.round(argument.qualityScore * 100);

  return (
    <div
      className={`w-[280px] rounded-lg border-2 ${styles.border} ${styles.glow} bg-[var(--canvas-surface)] p-3 transition-shadow hover:bg-[var(--canvas-surface-h)]`}
      data-testid={`tree-node-${argument.id}`}
      data-argument-type={argument.type}
    >
      {/* Target handle (incoming edge from parent) */}
      {argument.type !== "THESIS" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-slate-500 !border-0 !w-2 !h-2"
        />
      )}

      {/* Header row: badge + source + quality */}
      <div className="mb-2 flex items-center gap-1.5">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${styles.badge}`}>
          {badgeLabel}
        </span>
        <span className="font-mono-data text-[10px] text-[var(--canvas-text-sec)]">
          {argument.source === "AI" ? argument.generatedBy : "User"}
        </span>
        <span className="font-mono-data ml-auto text-[11px] text-[var(--canvas-text-sec)]">
          {qualityPercent}%
        </span>
      </div>

      {/* Argument text */}
      <p className="text-[13px] leading-snug text-[var(--canvas-text)]">
        {expanded ? argument.text : truncate(argument.text, 80)}
      </p>

      {/* Expanded: show scores + strategy */}
      {expanded && (
        <div className="mt-2 space-y-1">
          {argument.resilienceScore !== null && argument.resilienceScore !== undefined && (
            <div className="flex items-center gap-2">
              <span className="font-mono-data text-[10px] text-[var(--canvas-text-sec)]">
                R: {Math.round(argument.resilienceScore * 100)}%
              </span>
              <div className="flex-1 overflow-hidden rounded-full bg-slate-700 h-1">
                <div
                  className="h-full rounded-full bg-[var(--canvas-accent)]"
                  style={{ width: `${Math.round(argument.resilienceScore * 100)}%` }}
                />
              </div>
            </div>
          )}
          <p className="font-mono-data text-[10px] text-[var(--canvas-text-sec)]">
            {argument.reasoningStrategy}
          </p>
        </div>
      )}

      {/* Collapsed subtree badge */}
      {hiddenCount > 0 && (
        <div className="mt-2 text-center">
          <span className="font-mono-data rounded bg-slate-700 px-2 py-0.5 text-[10px] text-[var(--canvas-text-sec)]">
            +{hiddenCount} hidden
          </span>
        </div>
      )}

      {/* Source handle (outgoing edge to children) */}
      {childCount > 0 && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-slate-500 !border-0 !w-2 !h-2"
        />
      )}
    </div>
  );
}

export const ArgumentNode = memo(ArgumentNodeInner);
