import type { Session } from "neo4j-driver";
import neo4j from "neo4j-driver";
import { randomUUID } from "node:crypto";
import type { Argument, RejectedArgument } from "@dialectical/shared";
import { extractNode } from "./helpers.js";

interface SubmitArgumentParams {
  parentId: string;
  type: "PRO" | "CON";
  debateId: string;
  text: string;
  userId: string;
}

interface ArgumentContext {
  thesis: Argument;
  ancestors: Argument[];
  siblings: Argument[];
  target: Argument;
}

/**
 * Submit a user-written argument as a child of an existing argument.
 * Creates the argument and the relationship in one atomic transaction.
 */
export async function submitArgument(
  session: Session,
  params: SubmitArgumentParams,
): Promise<Argument> {
  const now = new Date().toISOString();
  const argumentId = randomUUID();
  // SAFETY: relType is derived from Zod-validated enum ("PRO" | "CON"), not user input
  const relType = params.type === "PRO" ? "HAS_PRO" : "HAS_CON";

  const result = await session.run(
    `MATCH (parent:Argument {id: $parentId, debateId: $debateId})
     CREATE (a:Argument {
       id: $argumentId,
       text: $text,
       type: $type,
       source: 'USER',
       generatedBy: $userId,
       pipelineTier: 'explorer',
       qualityScore: 1.0,
       resilienceScore: null,
       evidenceSources: [],
       reasoningStrategy: 'logical',
       parentId: $parentId,
       debateId: $debateId,
       depthLevel: parent.depthLevel + 1,
       createdAt: $now
     })
     CREATE (parent)-[:${relType}]->(a)
     WITH a
     MATCH (d:Debate {id: $debateId})
     SET d.totalNodes = d.totalNodes + 1, d.updatedAt = $now
     RETURN a`,
    {
      argumentId,
      parentId: params.parentId,
      debateId: params.debateId,
      text: params.text,
      type: params.type,
      userId: params.userId,
      now,
    },
  );

  const record = result.records[0];
  if (!record) {
    throw new Error("Failed to submit argument — parent not found");
  }

  const argument = extractNode<Argument>(record, "a");
  if (!argument) {
    throw new Error("Failed to extract argument from result");
  }

  return argument;
}

/**
 * Get a single argument by ID.
 */
export async function getArgumentById(
  session: Session,
  argumentId: string,
): Promise<Argument | null> {
  const result = await session.run(`MATCH (a:Argument {id: $argumentId}) RETURN a`, { argumentId });

  const record = result.records[0];
  if (!record) return null;

  return extractNode<Argument>(record, "a");
}

/**
 * Get rejected arguments for a debate (transparent pipeline audit trail).
 * Optionally filters by parent argument ID.
 */
export async function getRejectedArguments(
  session: Session,
  debateId: string,
  parentId?: string,
  limit: number = 50,
): Promise<RejectedArgument[]> {
  if (parentId) {
    const result = await session.run(
      `MATCH (parent:Argument {id: $parentId})-[:EXPLORED]->(r:RejectedArgument)
       WHERE r.debateId = $debateId
       RETURN r ORDER BY r.createdAt DESC LIMIT $limit`,
      { parentId, debateId, limit: neo4j.int(limit) },
    );

    return result.records
      .map((record) => extractNode<RejectedArgument>(record, "r"))
      .filter((r): r is RejectedArgument => r !== null);
  }

  const result = await session.run(
    `MATCH (r:RejectedArgument {debateId: $debateId})
     RETURN r ORDER BY r.createdAt DESC LIMIT $limit`,
    { debateId, limit: neo4j.int(limit) },
  );

  return result.records
    .map((record) => extractNode<RejectedArgument>(record, "r"))
    .filter((r): r is RejectedArgument => r !== null);
}

interface SaveRejectedArgumentParams {
  parentId: string;
  debateId: string;
  id: string;
  text: string;
  rejectionReason: string;
  failedAtStage: "consensus" | "dedup" | "stress-test";
  qualityScore: number;
}

/**
 * Save rejected arguments linked to their parent via EXPLORED relationship.
 * Uses UNWIND for batch insertion. Does NOT increase debate.totalNodes.
 */
export async function saveRejectedArguments(
  session: Session,
  params: SaveRejectedArgumentParams[],
): Promise<void> {
  if (params.length === 0) return;

  const now = new Date().toISOString();

  const items = params.map((p) => ({
    parentId: p.parentId,
    debateId: p.debateId,
    id: p.id,
    text: p.text,
    rejectionReason: p.rejectionReason,
    failedAtStage: p.failedAtStage,
    qualityScore: p.qualityScore,
    createdAt: now,
  }));

  await session.run(
    `UNWIND $items AS item
     MATCH (parent:Argument {id: item.parentId, debateId: item.debateId})
     CREATE (r:RejectedArgument {
       id: item.id, text: item.text, rejectionReason: item.rejectionReason,
       failedAtStage: item.failedAtStage, qualityScore: item.qualityScore,
       debateId: item.debateId, parentId: item.parentId, createdAt: item.createdAt
     })
     CREATE (parent)-[:EXPLORED]->(r)`,
    { items },
  );
}

/**
 * Set quality gate state on a parent argument node.
 * Called after pipeline returns qualityGateTriggered: true.
 */
export async function setQualityGate(
  session: Session,
  argumentId: string,
  debateId: string,
  direction: "PRO" | "CON",
): Promise<void> {
  await session.run(
    `MATCH (a:Argument {id: $argumentId, debateId: $debateId})
     SET a.qualityGatePro = CASE WHEN $direction = 'PRO' THEN true ELSE a.qualityGatePro END,
         a.qualityGateCon = CASE WHEN $direction = 'CON' THEN true ELSE a.qualityGateCon END`,
    { argumentId, debateId, direction },
  );
}

/**
 * Clear quality gate state on a parent argument after user submits an argument.
 */
export async function clearQualityGate(
  session: Session,
  parentId: string,
  argumentType: "PRO" | "CON",
): Promise<void> {
  await session.run(
    `MATCH (parent:Argument {id: $parentId})
     SET parent.qualityGatePro = CASE WHEN $type = 'PRO' THEN false ELSE parent.qualityGatePro END,
         parent.qualityGateCon = CASE WHEN $type = 'CON' THEN false ELSE parent.qualityGateCon END`,
    { parentId, type: argumentType },
  );
}

/**
 * Get sibling embeddings for semantic dedup.
 * Returns the embedding vectors of existing siblings of a given argument.
 */
export async function getSiblingEmbeddings(
  session: Session,
  parentId: string,
  debateId: string,
): Promise<number[][]> {
  const result = await session.run(
    `MATCH (parent:Argument {id: $parentId})-[:HAS_PRO|HAS_CON]->(sibling:Argument)
     WHERE sibling.debateId = $debateId AND sibling.embedding IS NOT NULL
     RETURN sibling.embedding AS embedding`,
    { parentId, debateId },
  );

  return result.records
    .map((record) => record.get("embedding") as number[] | null)
    .filter((e): e is number[] => e !== null);
}

/**
 * Get context for the AI pipeline: thesis, ancestor chain, siblings.
 * This is the primary input for context extraction.
 */
export async function getArgumentContext(
  session: Session,
  debateId: string,
  argumentId: string,
): Promise<ArgumentContext> {
  // Get ancestor chain from thesis to target
  const ancestorResult = await session.run(
    `MATCH path = (thesis:Argument {type: 'THESIS', debateId: $debateId})-[:HAS_PRO|HAS_CON*0..]->(target:Argument {id: $argumentId})
     RETURN nodes(path) AS ancestors`,
    { debateId, argumentId },
  );

  const ancestorRecord = ancestorResult.records[0];
  if (!ancestorRecord) {
    throw new Error(`Argument ${argumentId} not found in debate ${debateId}`);
  }

  const ancestorNodes = ancestorRecord.get("ancestors") as unknown[];
  const _ancestors = ancestorNodes.map(
    (node) => extractNode<Argument>({ get: () => node } as never, "") ?? (node as Argument),
  );

  // Parse properly using nodeToPlain
  const parsedAncestors: Argument[] = [];
  for (const node of ancestorNodes) {
    const props: Record<string, unknown> = {};
    const n = node as Record<string, unknown>;
    const nodeProps = (n["properties"] ?? n) as Record<string, unknown>;
    for (const [key, value] of Object.entries(nodeProps)) {
      props[key] = value;
    }
    parsedAncestors.push(props as Argument);
  }

  const thesis = parsedAncestors[0];
  const target = parsedAncestors[parsedAncestors.length - 1];

  if (!thesis || !target) {
    throw new Error("Failed to extract thesis or target from ancestor chain");
  }

  // Get siblings (other children of the target's parent)
  const siblingResult = await session.run(
    `MATCH (parent:Argument)-[:HAS_PRO|HAS_CON]->(sibling:Argument)
     WHERE parent.id = $parentId AND sibling.id <> $argumentId AND sibling.debateId = $debateId
     RETURN sibling`,
    {
      parentId: target.parentId ?? thesis.id,
      argumentId,
      debateId,
    },
  );

  const siblings = siblingResult.records
    .map((record) => extractNode<Argument>(record, "sibling"))
    .filter((s): s is Argument => s !== null);

  return {
    thesis,
    ancestors: parsedAncestors.slice(1, -1),
    siblings,
    target,
  };
}

interface SaveGeneratedArgumentParams {
  parentId: string;
  type: "PRO" | "CON";
  debateId: string;
  text: string;
  generatedBy: string;
  pipelineTier: string;
  qualityScore: number;
  resilienceScore: number | null;
  evidenceSources: string[];
  reasoningStrategy: string;
  embedding?: number[];
}

/**
 * Save an AI-generated argument to the database.
 * Called by the pipeline integration after generation completes.
 */
export async function saveGeneratedArgument(
  session: Session,
  params: SaveGeneratedArgumentParams,
): Promise<Argument> {
  const now = new Date().toISOString();
  const argumentId = randomUUID();
  // SAFETY: relType is derived from Zod-validated enum ("PRO" | "CON"), not user input
  const relType = params.type === "PRO" ? "HAS_PRO" : "HAS_CON";

  const result = await session.run(
    `MATCH (parent:Argument {id: $parentId, debateId: $debateId})
     CREATE (a:Argument {
       id: $argumentId,
       text: $text,
       type: $type,
       source: 'AI',
       generatedBy: $generatedBy,
       pipelineTier: $pipelineTier,
       qualityScore: $qualityScore,
       resilienceScore: $resilienceScore,
       evidenceSources: $evidenceSources,
       reasoningStrategy: $reasoningStrategy,
       parentId: $parentId,
       debateId: $debateId,
       depthLevel: parent.depthLevel + 1,
       createdAt: $now
     })
     CREATE (parent)-[:${relType}]->(a)
     WITH a
     MATCH (d:Debate {id: $debateId})
     SET d.totalNodes = d.totalNodes + 1, d.updatedAt = $now
     RETURN a`,
    {
      argumentId,
      parentId: params.parentId,
      debateId: params.debateId,
      text: params.text,
      type: params.type,
      generatedBy: params.generatedBy,
      pipelineTier: params.pipelineTier,
      qualityScore: params.qualityScore,
      resilienceScore: params.resilienceScore,
      evidenceSources: params.evidenceSources,
      reasoningStrategy: params.reasoningStrategy,
      now,
    },
  );

  // Set embedding separately if provided (Cypher doesn't support array params inline for vector)
  if (params.embedding && params.embedding.length > 0) {
    await session.run(
      `MATCH (a:Argument {id: $argumentId})
       SET a.embedding = $embedding`,
      { argumentId, embedding: params.embedding },
    );
  }

  const record = result.records[0];
  if (!record) {
    throw new Error("Failed to save generated argument — parent not found");
  }

  const argument = extractNode<Argument>(record, "a");
  if (!argument) {
    throw new Error("Failed to extract argument from result");
  }

  return argument;
}
