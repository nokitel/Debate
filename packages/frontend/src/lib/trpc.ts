"use client";

import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";
import { httpBatchLink, type TRPCLink } from "@trpc/client";
import type { AppRouter } from "@dialectical/backend";

// SAFETY: Explicit type annotation avoids TS2742 portability error
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();

const BACKEND_URL = process.env["NEXT_PUBLIC_BACKEND_URL"] ?? "http://localhost:4000";

export function getTRPCClient(): ReturnType<typeof trpc.createClient> {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${BACKEND_URL}/api/trpc`,
        headers() {
          return {};
        },
      }) as TRPCLink<AppRouter>,
    ],
  });
}
