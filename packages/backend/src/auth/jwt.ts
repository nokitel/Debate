import jwt from "jsonwebtoken";

interface TokenPayload {
  userId: string;
}

function getSecret(): string {
  const secret = process.env["NEXTAUTH_SECRET"] ?? process.env["JWT_SECRET"];
  if (!secret) {
    if (process.env["NODE_ENV"] === "production") {
      throw new Error("NEXTAUTH_SECRET or JWT_SECRET environment variable is required");
    }
    // SAFETY: Dev-only fallback so login works without configuring secrets.
    // Production always requires an explicit secret.
    return "dialectical-dev-secret-do-not-use-in-prod";
  }
  return secret;
}

/** Signs a JWT with the given userId. Expires in 7 days. */
export function signToken(userId: string): string {
  return jwt.sign({ userId } satisfies TokenPayload, getSecret(), {
    expiresIn: "7d",
  });
}

/** Verifies a JWT and returns the decoded payload. Throws on invalid/expired tokens. */
export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, getSecret());
  if (typeof decoded === "string" || !("userId" in decoded)) {
    throw new Error("Invalid token payload");
  }
  return { userId: decoded["userId"] as string };
}
