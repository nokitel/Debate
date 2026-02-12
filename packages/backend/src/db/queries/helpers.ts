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
 * Fields that must be explicitly null (not undefined) when missing from Neo4j.
 * Neo4j omits null properties from nodes, but Zod `.nullable()` requires
 * an explicit `null` value rather than the property being absent (undefined).
 *
 * Do NOT include `.optional()` fields here -- those should stay undefined.
 */
const NULLABLE_FIELDS: ReadonlyArray<string> = [
  "resilienceScore",
  "parentId",
];

/**
 * Convert a Neo4j node's properties to a plain JavaScript object.
 * Handles Neo4j Integer -> number conversion and ensures nullable fields
 * that Neo4j omits are explicitly set to null.
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

  // Ensure known nullable fields are explicitly null when missing.
  // Neo4j omits properties set to null, but Zod .nullable() requires null, not undefined.
  for (const field of NULLABLE_FIELDS) {
    if (!(field in props)) {
      props[field] = null;
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
