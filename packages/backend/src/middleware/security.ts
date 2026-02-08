import helmet from "helmet";
import type { Express } from "express";

/**
 * Applies security middleware (Helmet) to the Express app.
 * Must be called before CORS and route handlers.
 *
 * @param app - The Express application instance.
 */
export function applySecurityMiddleware(app: Express): void {
  const frontendUrl = process.env["FRONTEND_URL"] ?? "http://localhost:3000";

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", frontendUrl, "https://devnet-api.multiversx.com"],
          imgSrc: ["'self'", "data:", "https:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
      },
    }),
  );
}
