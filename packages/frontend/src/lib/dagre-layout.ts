import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";
import type { Argument } from "@dialectical/shared";

/** Depth at which subtrees are auto-collapsed on initial load. */
export const AUTO_COLLAPSE_DEPTH = 3;

/** Default node width in pixels. */
const NODE_WIDTH = 280;
/** Node height when collapsed (text truncated). */
const NODE_HEIGHT_COLLAPSED = 80;
/** Node height when expanded (full text + metadata). */
const NODE_HEIGHT_EXPANDED = 160;

/** Data attached to each React Flow node. */
export interface ArgumentNodeData {
  argument: Argument;
  expanded: boolean;
  childCount: number;
  hiddenCount: number;
  [key: string]: unknown;
}

/** Edge color by argument type. */
const EDGE_COLORS: Record<string, string> = {
  PRO: "var(--color-pro)",
  CON: "var(--color-con)",
  THESIS: "var(--color-thesis)",
};

/**
 * Check whether an argument is visible given the set of collapsed subtrees.
 * An argument is hidden if any of its ancestors is in the collapsedSubtrees set.
 */
function isVisible(
  arg: Argument,
  argsMap: Map<string, Argument>,
  collapsedSubtrees: ReadonlySet<string>,
): boolean {
  let currentId = arg.parentId;
  while (currentId !== null && currentId !== undefined) {
    if (collapsedSubtrees.has(currentId)) {
      return false;
    }
    const parent = argsMap.get(currentId);
    if (!parent) break;
    currentId = parent.parentId;
  }
  return true;
}

/**
 * Get the direct child count for each argument.
 */
function computeChildCounts(argsMap: Map<string, Argument>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const arg of argsMap.values()) {
    counts.set(arg.id, 0);
  }
  for (const arg of argsMap.values()) {
    if (arg.parentId !== null && arg.parentId !== undefined) {
      const current = counts.get(arg.parentId) ?? 0;
      counts.set(arg.parentId, current + 1);
    }
  }
  return counts;
}

/**
 * Count all descendants hidden under collapsed subtrees for a given node.
 */
function countHiddenDescendants(
  nodeId: string,
  argsMap: Map<string, Argument>,
  collapsedSubtrees: ReadonlySet<string>,
): number {
  if (!collapsedSubtrees.has(nodeId)) return 0;

  let count = 0;
  const stack: string[] = [nodeId];
  while (stack.length > 0) {
    const currentId = stack.pop();
    if (currentId === undefined) break;
    for (const arg of argsMap.values()) {
      if (arg.parentId === currentId) {
        count++;
        stack.push(arg.id);
      }
    }
  }
  return count;
}

/**
 * Filter arguments to only those visible given collapsed subtrees.
 */
export function getVisibleArguments(
  argsMap: Map<string, Argument>,
  collapsedSubtrees: ReadonlySet<string>,
): Argument[] {
  const visible: Argument[] = [];
  for (const arg of argsMap.values()) {
    if (isVisible(arg, argsMap, collapsedSubtrees)) {
      visible.push(arg);
    }
  }
  return visible;
}

interface LayoutResult {
  nodes: Node<ArgumentNodeData>[];
  edges: Edge[];
}

/**
 * Layout a debate argument tree using dagre for hierarchical positioning.
 *
 * @param argsMap - All arguments keyed by ID
 * @param expandedNodes - Set of node IDs with text expanded (taller)
 * @param collapsedSubtrees - Set of node IDs whose children are hidden
 * @returns Positioned React Flow nodes and edges
 */
export function layoutArgumentTree(
  argsMap: Map<string, Argument>,
  expandedNodes: ReadonlySet<string>,
  collapsedSubtrees: ReadonlySet<string>,
): LayoutResult {
  if (argsMap.size === 0) {
    return { nodes: [], edges: [] };
  }

  const visibleArgs = getVisibleArguments(argsMap, collapsedSubtrees);
  const childCounts = computeChildCounts(argsMap);

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 40 });

  // Add visible nodes
  for (const arg of visibleArgs) {
    const isExpanded = expandedNodes.has(arg.id);
    g.setNode(arg.id, {
      width: NODE_WIDTH,
      height: isExpanded ? NODE_HEIGHT_EXPANDED : NODE_HEIGHT_COLLAPSED,
    });
  }

  // Add edges for visible nodes only
  const visibleIds = new Set(visibleArgs.map((a) => a.id));
  const edges: Edge[] = [];

  for (const arg of visibleArgs) {
    if (arg.parentId !== null && arg.parentId !== undefined && visibleIds.has(arg.parentId)) {
      g.setEdge(arg.parentId, arg.id);
      edges.push({
        id: `e-${arg.parentId}-${arg.id}`,
        source: arg.parentId,
        target: arg.id,
        type: "smoothstep",
        style: { stroke: EDGE_COLORS[arg.type] ?? "#888" },
        animated: false,
      });
    }
  }

  dagre.layout(g);

  // Build positioned nodes
  const nodes: Node<ArgumentNodeData>[] = visibleArgs.map((arg) => {
    const nodeWithPosition = g.node(arg.id) as { x: number; y: number };
    const isExpanded = expandedNodes.has(arg.id);
    const hiddenCount = countHiddenDescendants(arg.id, argsMap, collapsedSubtrees);

    return {
      id: arg.id,
      type: "argumentNode",
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - (isExpanded ? NODE_HEIGHT_EXPANDED : NODE_HEIGHT_COLLAPSED) / 2,
      },
      data: {
        argument: arg,
        expanded: isExpanded,
        childCount: childCounts.get(arg.id) ?? 0,
        hiddenCount,
      },
    };
  });

  return { nodes, edges };
}
