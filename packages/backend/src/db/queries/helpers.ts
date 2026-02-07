import { type Record as Neo4jRecord, type Node, Integer } from "neo4j-driver";

/**
 * Convert a Neo4j Integer to a JavaScript number.
 * Safe for values within Number.MAX_SAFE_INTEGER.
 */
function toJsNumber(value: unknown): number {
  if (Integer.isInteger(value)) {
    return (value as InstanceType<typeof Integer>).toNumber();
  }
  return value as number;
}

/**
 * Convert a Neo4j node's properties to a plain JavaScript object.
 * Handles Neo4j Integer → number conversion.
 */
export function nodeToPlain<T>(node: Node): T {
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node.properties)) {
    if (Integer.isInteger(value)) {
      props[key] = toJsNumber(value);
    } else if (Array.isArray(value)) {
      props[key] = value.map((v) => (Integer.isInteger(v) ? toJsNumber(v) : v));
    } else {
      props[key] = value;
    }
  }
  return props as T;
}

/**
 * Extract a single node from a Neo4j record by its alias.
 * Returns null if the alias doesn't exist in the record.
 */
export function extractNode<T>(record: Neo4jRecord, alias: string): T | null {
  try {
    const node = record.get(alias) as Node | null;
    if (!node) return null;
    return nodeToPlain<T>(node);
  } catch {
    return null;
  }
}

/**
 * Extract a scalar value from a Neo4j record by alias.
 */
export function extractScalar<T>(record: Neo4jRecord, alias: string): T {
  const value = record.get(alias) as unknown;
  if (Integer.isInteger(value)) {
    return toJsNumber(value) as T;
  }
  return value as T;
}
