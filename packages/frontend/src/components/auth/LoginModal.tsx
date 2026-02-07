"use client";

import { useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { GoogleButton } from "./GoogleButton";
import { EmailPasswordForm } from "./EmailPasswordForm";

export function LoginModal(): React.JSX.Element | null {
  const isOpen = useUIStore((s) => s.isLoginModalOpen);
  const close = useUIStore((s) => s.closeLoginModal);
  const [mode, setMode] = useState<"login" | "register">("login");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-[var(--color-bg)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{mode === "login" ? "Sign In" : "Create Account"}</h2>
          <button
            onClick={close}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            aria-label="Close"
          >
            &#x2715;
          </button>
        </div>

        <GoogleButton />

        <div className="my-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-text-secondary)]">or</span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        <EmailPasswordForm mode={mode} />

        <p className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button onClick={() => setMode("register")} className="underline">
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("login")} className="underline">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
