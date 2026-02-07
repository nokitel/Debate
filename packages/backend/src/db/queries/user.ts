import type { Session } from "neo4j-driver";
import { randomUUID } from "node:crypto";
import type { User, AuthProvider } from "@dialectical/shared";
import { extractNode } from "./helpers.js";

interface CreateUserParams {
  email: string;
  displayName: string;
  authProvider: AuthProvider;
  passwordHash?: string;
  avatarUrl?: string;
}

interface CreateOAuthUserParams {
  email: string;
  displayName: string;
  authProvider: AuthProvider;
  avatarUrl?: string;
}

/**
 * Find a user by email address.
 */
export async function findUserByEmail(
  session: Session,
  email: string,
): Promise<(User & { passwordHash?: string }) | null> {
  const result = await session.run(`MATCH (u:User {email: $email}) RETURN u`, { email });

  const record = result.records[0];
  if (!record) return null;

  return extractNode<User & { passwordHash?: string }>(record, "u");
}

/**
 * Find a user by ID.
 */
export async function findUserById(session: Session, userId: string): Promise<User | null> {
  const result = await session.run(`MATCH (u:User {id: $userId}) RETURN u`, { userId });

  const record = result.records[0];
  if (!record) return null;

  return extractNode<User>(record, "u");
}

/**
 * Create a new user with email/password credentials.
 */
export async function createUser(session: Session, params: CreateUserParams): Promise<User> {
  const now = new Date().toISOString();
  const userId = randomUUID();

  const result = await session.run(
    `CREATE (u:User {
       id: $userId,
       email: $email,
       displayName: $displayName,
       avatarUrl: $avatarUrl,
       walletAddress: null,
       authProviders: [$authProvider],
       subscriptionTier: 'explorer',
       argumentsUsedThisMonth: 0,
       passwordHash: $passwordHash,
       createdAt: $now,
       updatedAt: $now
     })
     RETURN u`,
    {
      userId,
      email: params.email,
      displayName: params.displayName,
      avatarUrl: params.avatarUrl ?? null,
      authProvider: params.authProvider,
      passwordHash: params.passwordHash ?? null,
      now,
    },
  );

  const record = result.records[0];
  if (!record) {
    throw new Error("Failed to create user");
  }

  const user = extractNode<User>(record, "u");
  if (!user) {
    throw new Error("Failed to extract user from result");
  }

  return user;
}

/**
 * Find or create a user from an OAuth provider (Google/Apple).
 * Uses MERGE to be idempotent on email.
 */
export async function findOrCreateOAuthUser(
  session: Session,
  params: CreateOAuthUserParams,
): Promise<User> {
  const now = new Date().toISOString();
  const userId = randomUUID();

  const result = await session.run(
    `MERGE (u:User {email: $email})
     ON CREATE SET
       u.id = $userId,
       u.displayName = $displayName,
       u.avatarUrl = $avatarUrl,
       u.walletAddress = null,
       u.authProviders = [$authProvider],
       u.subscriptionTier = 'explorer',
       u.argumentsUsedThisMonth = 0,
       u.createdAt = $now,
       u.updatedAt = $now
     ON MATCH SET
       u.updatedAt = $now,
       u.authProviders = CASE
         WHEN NOT $authProvider IN u.authProviders
         THEN u.authProviders + $authProvider
         ELSE u.authProviders
       END
     RETURN u`,
    {
      userId,
      email: params.email,
      displayName: params.displayName,
      avatarUrl: params.avatarUrl ?? null,
      authProvider: params.authProvider,
      now,
    },
  );

  const record = result.records[0];
  if (!record) {
    throw new Error("Failed to find or create OAuth user");
  }

  const user = extractNode<User>(record, "u");
  if (!user) {
    throw new Error("Failed to extract user from result");
  }

  return user;
}
