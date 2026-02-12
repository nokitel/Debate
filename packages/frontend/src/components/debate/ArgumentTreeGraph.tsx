"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ReactFlow, MiniMap, Controls, type NodeMouseHandler, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useDebateStore } from "@/stores/debate-store";
import { useUIStore } from "@/stores/ui-store";
import { layoutArgumentTree, AUTO_COLLAPSE_DEPTH } from "@/lib/dagre-layout";
import type { ArgumentNodeData } from "@/lib/dagre-layout";
import { ArgumentNode } from "./ArgumentNode";
import { GenerateButton } from "./GenerateButton";

/** MiniMap color by argument type. */
function getMiniMapColor(node: { data?: Record<string, unknown> }): string {
  const data = node.data as ArgumentNodeData | undefined;
  if (!data) return "#888";
  switch (data.argument.type) {
    case "THESIS":
      return "#3b82f6";
    case "PRO":
      return "#22c55e";
    case "CON":
      return "#ef4444";
    default:
      return "#888";
  }
}

const nodeTypes: NodeTypes = {
  argumentNode: ArgumentNode,
};

/**
 * React Flow wrapper for the dark canvas debate tree.
 * Features glow edges, selected node detail panel, and status bar.
 */
export function ArgumentTreeGraph(): React.JSX.Element {
  const args = useDebateStore((s) => s.arguments);
  const debate = useDebateStore((s) => s.debate);
  const selectedId = useUIStore((s) => s.selectedArgumentId);
  const selectArgument = useUIStore((s) => s.selectArgument);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [collapsedSubtrees, setCollapsedSubtrees] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Auto-collapse nodes at depth >= AUTO_COLLAPSE_DEPTH on initial load
  useEffect(() => {
    if (initializedRef.current || args.size === 0) return;
    initializedRef.current = true;

    const toCollapse = new Set<string>();
    for (const arg of args.values()) {
      if (arg.depthLevel >= AUTO_COLLAPSE_DEPTH) {
        if (arg.parentId !== null && arg.parentId !== undefined) {
          const parent = args.get(arg.parentId);
          if (parent && parent.depthLevel >= AUTO_COLLAPSE_DEPTH - 1) {
            toCollapse.add(arg.parentId);
          }
        }
      }
    }
    if (toCollapse.size > 0) {
      setCollapsedSubtrees(toCollapse);
    }
  }, [args]);

  const { nodes, edges } = useMemo(
    () => layoutArgumentTree(args, expandedNodes, collapsedSubtrees),
    [args, expandedNodes, collapsedSubtrees],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const nodeId = node.id;
      selectArgument(nodeId);

      // Toggle text expansion
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return next;
      });

      // Toggle subtree collapse (only if node has children)
      const data = node.data as ArgumentNodeData;
      if (data.childCount > 0) {
        setCollapsedSubtrees((prev) => {
          const next = new Set(prev);
          if (next.has(nodeId)) {
            next.delete(nodeId);
          } else {
            next.add(nodeId);
          }
          return next;
        });
      }
    },
    [selectArgument],
  );

  // Get the selected argument for the detail panel
  const selectedArg = selectedId ? args.get(selectedId) : undefined;

  // Count stats
  const proCount = Array.from(args.values()).filter((a) => a.type === "PRO").length;
  const conCount = Array.from(args.values()).filter((a) => a.type === "CON").length;
  const maxDepth = Math.max(0, ...Array.from(args.values()).map((a) => a.depthLevel));

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Canvas tree */}
      <div className="relative flex-1" data-testid="tree-view-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => selectArgument(null)}
          fitView
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          style={{ background: "var(--canvas-bg)" }}
        >
          <MiniMap
            nodeColor={getMiniMapColor}
            zoomable
            pannable
            style={{
              backgroundColor: "var(--canvas-surface)",
              borderRadius: "8px",
              border: "1px solid var(--canvas-border)",
            }}
          />
          <Controls
            showFitView
            style={{
              borderRadius: "8px",
              border: "1px solid var(--canvas-border)",
              backgroundColor: "var(--canvas-surface)",
            }}
          />
        </ReactFlow>
      </div>

      {/* Selected node detail panel */}
      {selectedArg && (
        <div className="border-t border-[var(--canvas-border)] bg-[var(--canvas-surface)] p-4 sm:p-5">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                  selectedArg.type === "PRO"
                    ? "bg-green-500/20 text-green-300"
                    : selectedArg.type === "CON"
                      ? "bg-red-500/20 text-red-300"
                      : "bg-blue-500/20 text-blue-300"
                }`}
              >
                {selectedArg.type === "PRO"
                  ? "SUPPORTING"
                  : selectedArg.type === "CON"
                    ? "CHALLENGING"
                    : "THESIS"}
              </span>
              <span className="font-mono-data text-xs text-[var(--canvas-text-sec)]">
                {selectedArg.reasoningStrategy}
              </span>
              <span className="font-mono-data text-xs text-[var(--canvas-text-sec)]">
                {selectedArg.source === "AI" ? selectedArg.generatedBy : "User"}
              </span>
            </div>

            <p className="text-[15px] leading-relaxed text-[var(--canvas-text)]">
              &ldquo;{selectedArg.text}&rdquo;
            </p>

            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-mono-data text-xs text-[var(--canvas-text-sec)]">
                  Quality: {Math.round(selectedArg.qualityScore * 100)}%
                </span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-[var(--canvas-accent)]"
                    style={{ width: `${Math.round(selectedArg.qualityScore * 100)}%` }}
                  />
                </div>
              </div>
              {selectedArg.resilienceScore !== null &&
                selectedArg.resilienceScore !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data text-xs text-[var(--canvas-text-sec)]">
                      Resilience: {Math.round(selectedArg.resilienceScore * 100)}%
                    </span>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-[var(--canvas-accent)]"
                        style={{
                          width: `${Math.round(selectedArg.resilienceScore * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
            </div>

            {selectedArg.evidenceSources.length > 0 && (
              <p className="font-mono-data mt-2 text-xs text-[var(--canvas-text-sec)]">
                Sources:{" "}
                {selectedArg.evidenceSources
                  .map((u) => {
                    try {
                      return new URL(u).hostname;
                    } catch {
                      return u;
                    }
                  })
                  .join(" \u00B7 ")}
              </p>
            )}

            {debate && (
              <div className="mt-3 flex gap-2">
                <GenerateButton parentId={selectedArg.id} debateId={debate.id} type="PRO" />
                <GenerateButton parentId={selectedArg.id} debateId={debate.id} type="CON" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-[var(--canvas-border)] bg-[var(--canvas-surface)] px-4 py-2">
        <span className="font-mono-data text-xs text-[var(--canvas-text-sec)]">
          {args.size} nodes &middot; Depth {maxDepth} &middot; {proCount} support &middot;{" "}
          {conCount} challenge
        </span>
      </div>
    </div>
  );
}
