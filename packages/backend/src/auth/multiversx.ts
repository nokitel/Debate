import { NativeAuthServer } from "@multiversx/sdk-native-auth-server";

/**
 * Validates a MultiversX Native Auth token using the NativeAuthServer library.
 *
 * @param token - The Native Auth token string from the client.
 * @returns The validated result containing the signer address, or throws on failure.
 */

let nativeAuthServer: NativeAuthServer | null = null;

function getAuthServer(): NativeAuthServer {
  if (nativeAuthServer) return nativeAuthServer;

  const apiUrl = process.env["MULTIVERSX_API_URL"] ?? "https://devnet-api.multiversx.com";

  nativeAuthServer = new NativeAuthServer({
    apiUrl,
    maxExpirySeconds: 86400, // 24 hours
    acceptedOrigins: [process.env["FRONTEND_URL"] ?? "http://localhost:3000"],
  });

  return nativeAuthServer;
}

export interface NativeAuthResult {
  /** The bech32 address of the signer. */
  address: string;
  /** The origin that created the token. */
  origin: string;
  /** Remaining seconds until expiry. */
  expiresIn: number;
}

/**
 * Validate a MultiversX Native Auth token.
 * Throws if the token is invalid or expired.
 *
 * @param token - The Base64-encoded Native Auth token.
 * @returns Validated address and metadata.
 */
export async function validateNativeAuthToken(token: string): Promise<NativeAuthResult> {
  const server = getAuthServer();
  const result = await server.validate(token);

  return {
    address: result.address,
    origin: result.origin,
    expiresIn: result.expires - Math.floor(Date.now() / 1000),
  };
}

/**
 * Reset the NativeAuthServer singleton (for testing).
 */
export function resetNativeAuthServer(): void {
  nativeAuthServer = null;
}
