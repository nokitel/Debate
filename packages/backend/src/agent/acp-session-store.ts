import { randomUUID } from "node:crypto";

/**
 * In-memory ACP checkout session store.
 * TODO(P5.AGENT.01): Upgrade to Neo4j persistence for production.
 */

export type SessionStatus = "open" | "completed" | "cancelled" | "expired";

export interface CheckoutLineItem {
  /** Product ID (e.g., 'debate_argument_pro'). */
  productId: string;
  /** Quantity requested. */
  quantity: number;
  /** Price per unit in USD cents. */
  unitPriceCents: number;
}

export interface CheckoutSession {
  /** Unique session ID. */
  id: string;
  /** Session status. */
  status: SessionStatus;
  /** Line items in this checkout. */
  lineItems: CheckoutLineItem[];
  /** Total price in USD cents. */
  totalCents: number;
  /** Agent identifier (from authentication). */
  agentId: string;
  /** Metadata from the creating agent. */
  metadata: Record<string, string>;
  /** ISO timestamp when created. */
  createdAt: string;
  /** ISO timestamp when last updated. */
  updatedAt: string;
  /** ISO timestamp when completed (null if not completed). */
  completedAt: string | null;
  /** On-chain tx hash if settled via MultiversX ACP adapter. */
  txHash: string | null;
}

const sessions = new Map<string, CheckoutSession>();

/** Session TTL: 30 minutes. */
const SESSION_TTL_MS = 30 * 60 * 1000;

/**
 * Create a new checkout session.
 */
export function createSession(
  agentId: string,
  lineItems: CheckoutLineItem[],
  metadata: Record<string, string>,
): CheckoutSession {
  const now = new Date().toISOString();
  const totalCents = lineItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);

  const session: CheckoutSession = {
    id: randomUUID(),
    status: "open",
    lineItems,
    totalCents,
    agentId,
    metadata,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    txHash: null,
  };

  sessions.set(session.id, session);
  return session;
}

/**
 * Get a checkout session by ID.
 */
export function getSessionById(id: string): CheckoutSession | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;

  // Check TTL
  const age = Date.now() - new Date(session.createdAt).getTime();
  if (age > SESSION_TTL_MS && session.status === "open") {
    session.status = "expired";
    session.updatedAt = new Date().toISOString();
  }

  return session;
}

/**
 * Update a checkout session.
 */
export function updateSession(
  id: string,
  updates: Partial<Pick<CheckoutSession, "lineItems" | "metadata">>,
): CheckoutSession | undefined {
  const session = sessions.get(id);
  if (!session || session.status !== "open") return undefined;

  if (updates.lineItems) {
    session.lineItems = updates.lineItems;
    session.totalCents = updates.lineItems.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );
  }
  if (updates.metadata) {
    session.metadata = { ...session.metadata, ...updates.metadata };
  }
  session.updatedAt = new Date().toISOString();

  return session;
}

/**
 * Complete a checkout session.
 */
export function completeSession(id: string, txHash?: string): CheckoutSession | undefined {
  const session = sessions.get(id);
  if (!session || session.status !== "open") return undefined;

  session.status = "completed";
  session.completedAt = new Date().toISOString();
  session.updatedAt = session.completedAt;
  session.txHash = txHash ?? null;

  return session;
}

/**
 * Cancel a checkout session.
 */
export function cancelSession(id: string): CheckoutSession | undefined {
  const session = sessions.get(id);
  if (!session || session.status !== "open") return undefined;

  session.status = "cancelled";
  session.updatedAt = new Date().toISOString();

  return session;
}

/**
 * Clean up expired sessions (call periodically).
 */
export function cleanupExpiredSessions(): number {
  let cleaned = 0;
  const now = Date.now();

  for (const [id, session] of sessions) {
    const age = now - new Date(session.createdAt).getTime();
    if (age > SESSION_TTL_MS * 2) {
      sessions.delete(id);
      cleaned++;
    }
  }

  return cleaned;
}
