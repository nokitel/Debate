"use client";

import { type ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider wrapper.
 * In Phase 1, auth state is managed via tRPC calls to the backend.
 * Auth.js SessionProvider will be added when we integrate the Auth.js
 * middleware in a future phase.
 */
export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  return <>{children}</>;
}
