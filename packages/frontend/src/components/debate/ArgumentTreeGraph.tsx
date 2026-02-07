"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ReactFlow, MiniMap, Controls, type NodeMouseHandler, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useDebateStore } from "@/stores/debate-store";
import { layoutArgumentTree, AUTO_COLLAPSE_DEPTH } from "@/lib/dagre-layout";
import type { ArgumentNodeData } from "@/lib/dagre-layout";
import { ArgumentNode } from "./ArgumentNode";

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
 * React Flow wrapper that renders the debate argument tree as an interactive graph.
 * Uses dagre for hierarchical layout with auto-collapse for deep trees.
 */
export function ArgumentTreeGraph(): React.JSX.Element {
  const args = useDebateStore((s) => s.arguments);
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
        // Collapse the parent so this node is hidden
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

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const nodeId = node.id;

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
  }, []);

  return (
    <div className="h-[600px] w-full rounded-md border" data-testid="tree-view-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap nodeColor={getMiniMapColor} zoomable pannable />
        <Controls showFitView />
      </ReactFlow>
    </div>
  );
}
