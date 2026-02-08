import type { Session } from "neo4j-driver";
import { randomUUID } from "node:crypto";
import type { User, AuthProvider, PipelineTier } from "@dialectical/shared";
import { extractNode, extractScalar } from "./helpers.js";

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

/** Tier info returned from Neo4j for subscription enforcement. */
export interface UserTierInfo {
  subscriptionTier: PipelineTier;
  argumentsUsedThisMonth: number;
}

/**
 * Get a user's subscription tier and monthly usage count.
 * Used by the tier enforcement middleware.
 */
export async function getUserTierInfo(
  session: Session,
  userId: string,
): Promise<UserTierInfo | null> {
  const result = await session.run(
    `MATCH (u:User {id: $userId})
     RETURN u.subscriptionTier AS tier, u.argumentsUsedThisMonth AS used`,
    { userId },
  );

  const record = result.records[0];
  if (!record) return null;

  const tier = extractScalar<string>(record, "tier") as PipelineTier;
  const used = extractScalar<number>(record, "used");

  return { subscriptionTier: tier, argumentsUsedThisMonth: used };
}

/**
 * Increment the monthly argument usage counter for a user.
 * Called after a successful pipeline generation.
 */
export async function incrementArgumentCount(session: Session, userId: string): Promise<void> {
  await session.run(
    `MATCH (u:User {id: $userId})
     SET u.argumentsUsedThisMonth = u.argumentsUsedThisMonth + 1,
         u.updatedAt = $now`,
    { userId, now: new Date().toISOString() },
  );
}

/**
 * Find or create a user by their MultiversX wallet address.
 * Uses MERGE on walletAddress for idempotence.
 */
export async function findOrCreateWalletUser(
  session: Session,
  walletAddress: string,
): Promise<User> {
  const now = new Date().toISOString();
  const userId = randomUUID();

  const result = await session.run(
    `MERGE (u:User {walletAddress: $walletAddress})
     ON CREATE SET
       u.id = $userId,
       u.email = null,
       u.displayName = $displayName,
       u.avatarUrl = null,
       u.authProviders = ['multiversx'],
       u.subscriptionTier = 'explorer',
       u.argumentsUsedThisMonth = 0,
       u.createdAt = $now,
       u.updatedAt = $now
     ON MATCH SET
       u.updatedAt = $now,
       u.authProviders = CASE
         WHEN NOT 'multiversx' IN u.authProviders
         THEN u.authProviders + 'multiversx'
         ELSE u.authProviders
       END
     RETURN u`,
    {
      userId,
      walletAddress,
      displayName: walletAddress.slice(0, 8) + "..." + walletAddress.slice(-4),
      now,
    },
  );

  const record = result.records[0];
  if (!record) {
    throw new Error("Failed to find or create wallet user");
  }

  const user = extractNode<User>(record, "u");
  if (!user) {
    throw new Error("Failed to extract wallet user from result");
  }

  return user;
}

/**
 * Link a MultiversX wallet address to an existing user account.
 * Adds 'multiversx' to authProviders if not already present.
 */
export async function linkWalletToUser(
  session: Session,
  userId: string,
  walletAddress: string,
): Promise<void> {
  await session.run(
    `MATCH (u:User {id: $userId})
     SET u.walletAddress = $walletAddress,
         u.authProviders = CASE
           WHEN NOT 'multiversx' IN u.authProviders
           THEN u.authProviders + 'multiversx'
           ELSE u.authProviders
         END,
         u.updatedAt = $now`,
    { userId, walletAddress, now: new Date().toISOString() },
  );
}
