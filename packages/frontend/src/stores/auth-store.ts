"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthUser {
  userId: string;
  email: string;
  displayName: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;

  /** Store token and user info after successful login/register. */
  login: (token: string, user: AuthUser) => void;
  /** Clear auth state on sign out. */
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "dialectical-auth",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
