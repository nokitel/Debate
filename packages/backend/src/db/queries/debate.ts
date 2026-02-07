import type { Session } from "neo4j-driver";
import { randomUUID } from "node:crypto";
import type { Argument, Debate } from "@dialectical/shared";
import { extractNode, extractScalar } from "./helpers.js";

interface CreateDebateParams {
  title: string;
  description?: string;
  thesisText: string;
  createdBy: string;
}

interface ListDebatesParams {
  limit: number;
  cursor?: string;
  createdBy?: string;
}

interface ListDebatesResult {
  debates: Debate[];
  hasNext: boolean;
  nextCursor: string | null;
}

/**
 * Atomically create a Debate + Thesis Argument + HAS_THESIS relationship.
 * Returns both the debate and the thesis argument.
 */
export async function createDebateWithThesis(
  session: Session,
  params: CreateDebateParams,
): Promise<{ debate: Debate; thesis: Argument }> {
  const now = new Date().toISOString();
  const debateId = randomUUID();
  const thesisId = randomUUID();

  const result = await session.run(
    `CREATE (d:Debate {
       id: $debateId,
       title: $title,
       description: $description,
       createdBy: $createdBy,
       isPublic: true,
       totalNodes: 1,
       status: 'active',
       createdAt: $now,
       updatedAt: $now
     })
     CREATE (a:Argument {
       id: $thesisId,
       text: $thesisText,
       type: 'THESIS',
       source: 'USER',
       generatedBy: $createdBy,
       pipelineTier: 'explorer',
       qualityScore: 1.0,
       resilienceScore: null,
       evidenceSources: [],
       reasoningStrategy: 'logical',
       parentId: null,
       debateId: $debateId,
       depthLevel: 0,
       createdAt: $now
     })
     CREATE (d)-[:HAS_THESIS]->(a)
     RETURN d, a`,
    {
      debateId,
      thesisId,
      title: params.title,
      description: params.description ?? "",
      thesisText: params.thesisText,
      createdBy: params.createdBy,
      now,
    },
  );

  const record = result.records[0];
  if (!record) {
    throw new Error("Failed to create debate");
  }

  const debate = extractNode<Debate>(record, "d");
  const thesis = extractNode<Argument>(record, "a");

  if (!debate || !thesis) {
    throw new Error("Failed to extract debate or thesis from result");
  }

  return { debate, thesis };
}

/**
 * List debates with cursor-based pagination.
 * Fetches limit+1 to detect if there are more results.
 */
export async function listDebates(
  session: Session,
  params: ListDebatesParams,
): Promise<ListDebatesResult> {
  const fetchLimit = params.limit + 1;

  let query: string;
  const queryParams: Record<string, unknown> = { limit: fetchLimit };

  if (params.cursor) {
    query = params.createdBy
      ? `MATCH (d:Debate)
         WHERE d.createdAt < $cursor AND d.createdBy = $createdBy AND d.status = 'active'
         RETURN d ORDER BY d.createdAt DESC LIMIT $limit`
      : `MATCH (d:Debate)
         WHERE d.createdAt < $cursor AND d.status = 'active'
         RETURN d ORDER BY d.createdAt DESC LIMIT $limit`;
    queryParams["cursor"] = params.cursor;
    if (params.createdBy) queryParams["createdBy"] = params.createdBy;
  } else {
    query = params.createdBy
      ? `MATCH (d:Debate)
         WHERE d.createdBy = $createdBy AND d.status = 'active'
         RETURN d ORDER BY d.createdAt DESC LIMIT $limit`
      : `MATCH (d:Debate)
         WHERE d.status = 'active'
         RETURN d ORDER BY d.createdAt DESC LIMIT $limit`;
    if (params.createdBy) queryParams["createdBy"] = params.createdBy;
  }

  const result = await session.run(query, queryParams);

  const debates = result.records
    .slice(0, params.limit)
    .map((record) => extractNode<Debate>(record, "d"))
    .filter((d): d is Debate => d !== null);

  const hasNext = result.records.length > params.limit;
  const lastDebate = debates[debates.length - 1];
  const nextCursor = hasNext && lastDebate ? lastDebate.createdAt : null;

  return { debates, hasNext, nextCursor };
}

/**
 * Get a single debate by ID.
 */
export async function getDebateById(session: Session, debateId: string): Promise<Debate | null> {
  const result = await session.run(`MATCH (d:Debate {id: $debateId}) RETURN d`, { debateId });

  const record = result.records[0];
  if (!record) return null;

  return extractNode<Debate>(record, "d");
}

/**
 * Get the full argument tree for a debate.
 * Returns a flat array of all arguments; frontend reconstructs the tree via parentId.
 */
export async function getDebateTree(session: Session, debateId: string): Promise<Argument[]> {
  const result = await session.run(
    `MATCH (a:Argument {debateId: $debateId})
     RETURN a ORDER BY a.depthLevel ASC, a.createdAt ASC`,
    { debateId },
  );

  return result.records
    .map((record) => extractNode<Argument>(record, "a"))
    .filter((a): a is Argument => a !== null);
}

/**
 * Archive a debate (soft delete). Only the creator can archive.
 */
export async function archiveDebate(
  session: Session,
  debateId: string,
  userId: string,
): Promise<boolean> {
  const result = await session.run(
    `MATCH (d:Debate {id: $debateId, createdBy: $userId})
     SET d.status = 'archived', d.updatedAt = $now
     RETURN d`,
    { debateId, userId, now: new Date().toISOString() },
  );

  return result.records.length > 0;
}

/**
 * Get the total number of arguments in a debate.
 */
export async function getDebateNodeCount(session: Session, debateId: string): Promise<number> {
  const result = await session.run(
    `MATCH (a:Argument {debateId: $debateId})
     RETURN count(a) AS total`,
    { debateId },
  );

  const record = result.records[0];
  if (!record) return 0;

  return extractScalar<number>(record, "total");
}
