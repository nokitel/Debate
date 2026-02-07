import { describe, it, expect } from "vitest";
import type { Argument } from "@dialectical/shared";
import type { Node } from "@xyflow/react";
import { layoutArgumentTree, getVisibleArguments, AUTO_COLLAPSE_DEPTH } from "./dagre-layout";
import type { ArgumentNodeData } from "./dagre-layout";

const DEBATE_ID = "d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0";

function makeArgument(overrides: Partial<Argument> & { id: string }): Argument {
  return {
    text: `Argument ${overrides.id}`,
    type: "PRO",
    source: "AI",
    generatedBy: "qwen2.5:latest",
    pipelineTier: "explorer",
    qualityScore: 0.8,
    resilienceScore: null,
    evidenceSources: [],
    reasoningStrategy: "logical",
    parentId: null,
    debateId: DEBATE_ID,
    depthLevel: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function buildMap(args: Argument[]): Map<string, Argument> {
  return new Map(args.map((a) => [a.id, a]));
}

/** Find node by ID and assert it exists. */
function findNode(nodes: Node<ArgumentNodeData>[], id: string): Node<ArgumentNodeData> {
  const node = nodes.find((n) => n.id === id);
  if (!node) throw new Error(`Node ${id} not found`);
  return node;
}

describe("argument-node dagre-layout", () => {
  it("lays out a basic 3-node tree with thesis at top", () => {
    const thesis = makeArgument({ id: "thesis-1", type: "THESIS", depthLevel: 0 });
    const pro = makeArgument({ id: "pro-1", type: "PRO", parentId: "thesis-1", depthLevel: 1 });
    const con = makeArgument({ id: "con-1", type: "CON", parentId: "thesis-1", depthLevel: 1 });

    const argsMap = buildMap([thesis, pro, con]);
    const { nodes, edges } = layoutArgumentTree(argsMap, new Set(), new Set());

    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);

    const thesisNode = findNode(nodes, "thesis-1");
    const proNode = findNode(nodes, "pro-1");
    const conNode = findNode(nodes, "con-1");

    // Thesis should be above children (lower Y = higher on screen for TB layout)
    expect(thesisNode.position.y).toBeLessThan(proNode.position.y);
    expect(thesisNode.position.y).toBeLessThan(conNode.position.y);
  });

  it("hides children of collapsed subtrees", () => {
    const thesis = makeArgument({ id: "thesis-1", type: "THESIS", depthLevel: 0 });
    const pro = makeArgument({ id: "pro-1", type: "PRO", parentId: "thesis-1", depthLevel: 1 });
    const con = makeArgument({ id: "con-1", type: "CON", parentId: "pro-1", depthLevel: 2 });

    const argsMap = buildMap([thesis, pro, con]);
    const collapsedSubtrees = new Set(["pro-1"]);

    const { nodes, edges } = layoutArgumentTree(argsMap, new Set(), collapsedSubtrees);

    expect(nodes).toHaveLength(2); // thesis + pro visible, con hidden
    expect(edges).toHaveLength(1); // thesis → pro
    expect(nodes.find((n) => n.id === "con-1")).toBeUndefined();

    // pro-1 should show hiddenCount = 1
    const proNode = findNode(nodes, "pro-1");
    expect(proNode.data.hiddenCount).toBe(1);
  });

  it("uses taller node height for expanded nodes", () => {
    const thesis = makeArgument({ id: "thesis-1", type: "THESIS", depthLevel: 0 });
    const pro = makeArgument({ id: "pro-1", type: "PRO", parentId: "thesis-1", depthLevel: 1 });

    const argsMap = buildMap([thesis, pro]);
    const expandedNodes = new Set(["pro-1"]);

    const { nodes } = layoutArgumentTree(argsMap, expandedNodes, new Set());

    const proNode = findNode(nodes, "pro-1");
    expect(proNode.data.expanded).toBe(true);

    const thesisNode = findNode(nodes, "thesis-1");
    expect(thesisNode.data.expanded).toBe(false);
  });

  it("returns empty arrays for empty argument map", () => {
    const argsMap = new Map<string, Argument>();
    const { nodes, edges } = layoutArgumentTree(argsMap, new Set(), new Set());

    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it("computes correct child counts including hidden children", () => {
    const thesis = makeArgument({ id: "thesis-1", type: "THESIS", depthLevel: 0 });
    const pro1 = makeArgument({ id: "pro-1", type: "PRO", parentId: "thesis-1", depthLevel: 1 });
    const pro2 = makeArgument({ id: "pro-2", type: "PRO", parentId: "thesis-1", depthLevel: 1 });
    const con1 = makeArgument({ id: "con-1", type: "CON", parentId: "pro-1", depthLevel: 2 });
    const con2 = makeArgument({ id: "con-2", type: "CON", parentId: "pro-1", depthLevel: 2 });

    const argsMap = buildMap([thesis, pro1, pro2, con1, con2]);

    // Collapse pro-1's children
    const { nodes } = layoutArgumentTree(argsMap, new Set(), new Set(["pro-1"]));

    const thesisNode = findNode(nodes, "thesis-1");
    const pro1Node = findNode(nodes, "pro-1");

    // thesis has 2 children (pro-1, pro-2)
    expect(thesisNode.data.childCount).toBe(2);
    // pro-1 has 2 children (con-1, con-2) — childCount reflects total, hiddenCount reflects hidden
    expect(pro1Node.data.childCount).toBe(2);
    expect(pro1Node.data.hiddenCount).toBe(2);
  });

  it("exports AUTO_COLLAPSE_DEPTH constant", () => {
    expect(AUTO_COLLAPSE_DEPTH).toBe(3);
  });

  it("getVisibleArguments returns only non-hidden arguments", () => {
    const thesis = makeArgument({ id: "thesis-1", type: "THESIS", depthLevel: 0 });
    const pro = makeArgument({ id: "pro-1", type: "PRO", parentId: "thesis-1", depthLevel: 1 });
    const con = makeArgument({ id: "con-1", type: "CON", parentId: "pro-1", depthLevel: 2 });
    const deep = makeArgument({ id: "deep-1", type: "PRO", parentId: "con-1", depthLevel: 3 });

    const argsMap = buildMap([thesis, pro, con, deep]);
    const collapsed = new Set(["pro-1"]);

    const visible = getVisibleArguments(argsMap, collapsed);
    expect(visible).toHaveLength(2);
    expect(visible.map((a) => a.id).sort()).toEqual(["pro-1", "thesis-1"]);
  });
});
