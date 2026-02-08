import { getSession } from "../db/neo4j.js";
import {
  findOrCreateOAuthUser,
  findOrCreateWalletUser,
  findUserByEmail,
} from "../db/queries/user.js";
import { verifyPassword } from "./credentials.js";
import { validateNativeAuthToken } from "./multiversx.js";

/**
 * Auth configuration for the backend.
 * Handles JWT token creation and validation.
 *
 * Auth.js v5 is mounted as Express middleware.
 * The JWT contains userId which is extracted in tRPC context.
 */

export interface JwtPayload {
  userId: string;
  email: string | null;
  displayName: string;
}

/**
 * Authenticate a user with email/password.
 * Returns the JWT payload or null if authentication fails.
 */
export async function authenticateCredentials(
  email: string,
  password: string,
): Promise<JwtPayload | null> {
  const session = getSession();
  try {
    const user = await findUserByEmail(session, email);
    if (!user || !user.passwordHash) return null;

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return null;

    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    };
  } finally {
    await session.close();
  }
}

/**
 * Authenticate or create a user from an OAuth provider.
 * Returns the JWT payload.
 */
export async function authenticateOAuth(
  email: string,
  displayName: string,
  provider: "google" | "apple",
  avatarUrl?: string,
): Promise<JwtPayload> {
  const session = getSession();
  try {
    const user = await findOrCreateOAuthUser(session, {
      email,
      displayName,
      authProvider: provider,
      avatarUrl,
    });

    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    };
  } finally {
    await session.close();
  }
}

/**
 * Authenticate a user with a MultiversX wallet via Native Auth token.
 * Validates the token, then finds or creates the user by wallet address.
 * Returns the JWT payload.
 *
 * @param address - The bech32 wallet address.
 * @param token - The Native Auth token from the wallet signing flow.
 */
export async function authenticateWallet(address: string, token: string): Promise<JwtPayload> {
  // Validate the Native Auth token — throws on failure
  const validated = await validateNativeAuthToken(token);

  // Ensure the address in the token matches the claimed address
  if (validated.address !== address) {
    throw new Error("Token address does not match claimed address");
  }

  const session = getSession();
  try {
    const user = await findOrCreateWalletUser(session, address);

    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    };
  } finally {
    await session.close();
  }
}
