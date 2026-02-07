import { describe, it, expect } from "vitest";
import type { Argument } from "@dialectical/shared";
import { layoutArgumentTree, getVisibleArguments, AUTO_COLLAPSE_DEPTH } from "./dagre-layout";

const DEBATE_ID = "perf-test-0000-0000-0000-000000000000";

/**
 * Generate a balanced binary tree of arguments.
 *
 * @param count - Total number of arguments (including thesis)
 * @returns Map of arguments keyed by ID
 */
function generateTree(count: number): Map<string, Argument> {
  const args: Argument[] = [];
  const now = new Date().toISOString();

  // Thesis at index 0
  args.push({
    id: "node-0",
    text: "Thesis argument for performance testing of the tree visualization system.",
    type: "THESIS",
    source: "AI",
    generatedBy: "qwen2.5:latest",
    pipelineTier: "explorer",
    qualityScore: 1.0,
    resilienceScore: null,
    evidenceSources: [],
    reasoningStrategy: "logical",
    parentId: null,
    debateId: DEBATE_ID,
    depthLevel: 0,
    createdAt: now,
  });

  // Binary tree: parent of node i is node floor((i-1)/2)
  for (let i = 1; i < count; i++) {
    const parentIdx = Math.floor((i - 1) / 2);
    const parentArg = args[parentIdx];
    if (!parentArg) throw new Error(`Parent at index ${parentIdx} not found`);
    const parentDepth = parentArg.depthLevel;
    args.push({
      id: `node-${i}`,
      text: `Argument node ${i} for testing layout performance with realistic text content.`,
      type: i % 2 === 1 ? "PRO" : "CON",
      source: "AI",
      generatedBy: "mistral-nemo:latest",
      pipelineTier: "explorer",
      qualityScore: 0.7 + Math.random() * 0.3,
      resilienceScore: null,
      evidenceSources: [],
      reasoningStrategy: "empirical",
      parentId: `node-${parentIdx}`,
      debateId: DEBATE_ID,
      depthLevel: parentDepth + 1,
      createdAt: now,
    });
  }

  return new Map(args.map((a) => [a.id, a]));
}

describe("tree-performance dagre layout", () => {
  it("lays out 500 nodes in under 2 seconds", () => {
    const argsMap = generateTree(500);

    const start = performance.now();
    const { nodes, edges } = layoutArgumentTree(argsMap, new Set(), new Set());
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2000);
    expect(nodes).toHaveLength(500);
    // Binary tree with 500 nodes has 499 edges (every non-root has a parent)
    expect(edges).toHaveLength(499);
  });

  it("auto-collapse at depth >= 3 reduces visible nodes to depth <= 2", () => {
    const argsMap = generateTree(500);

    // Simulate auto-collapse: collapse nodes at depth >= AUTO_COLLAPSE_DEPTH - 1
    // that have children at depth >= AUTO_COLLAPSE_DEPTH
    const collapsedSubtrees = new Set<string>();
    for (const arg of argsMap.values()) {
      if (arg.depthLevel >= AUTO_COLLAPSE_DEPTH) {
        if (arg.parentId !== null && arg.parentId !== undefined) {
          const parent = argsMap.get(arg.parentId);
          if (parent && parent.depthLevel >= AUTO_COLLAPSE_DEPTH - 1) {
            collapsedSubtrees.add(arg.parentId);
          }
        }
      }
    }

    const visible = getVisibleArguments(argsMap, collapsedSubtrees);

    // All visible nodes should be at depth <= AUTO_COLLAPSE_DEPTH - 1
    for (const arg of visible) {
      expect(arg.depthLevel).toBeLessThan(AUTO_COLLAPSE_DEPTH);
    }

    // Should be significantly fewer visible nodes than total
    expect(visible.length).toBeLessThan(argsMap.size);
    expect(visible.length).toBeGreaterThan(0);
  });

  it("edge count matches parent-child relationships among visible nodes", () => {
    const argsMap = generateTree(500);

    // Collapse at depth 2 to get a smaller visible set
    const collapsedSubtrees = new Set<string>();
    for (const arg of argsMap.values()) {
      if (arg.depthLevel >= 2) {
        if (arg.parentId !== null && arg.parentId !== undefined) {
          const parent = argsMap.get(arg.parentId);
          if (parent && parent.depthLevel >= 1) {
            collapsedSubtrees.add(arg.parentId);
          }
        }
      }
    }

    const { nodes, edges } = layoutArgumentTree(argsMap, new Set(), collapsedSubtrees);
    const visibleIds = new Set(nodes.map((n) => n.id));

    // Count expected edges: visible nodes that have a visible parent
    let expectedEdges = 0;
    for (const node of nodes) {
      const arg = argsMap.get(node.id);
      if (
        arg &&
        arg.parentId !== null &&
        arg.parentId !== undefined &&
        visibleIds.has(arg.parentId)
      ) {
        expectedEdges++;
      }
    }

    expect(edges).toHaveLength(expectedEdges);
  });
});
