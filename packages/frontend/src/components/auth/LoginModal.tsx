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
      <div
        className="w-full max-w-md rounded-xl border border-[var(--pub-border)] bg-[var(--pub-surface)] p-6 shadow-xl"
        data-testid="login-modal"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif-display text-xl font-bold text-[var(--pub-text)]">
            {mode === "login" ? "Sign In" : "Create Account"}
          </h2>
          <button
            onClick={close}
            className="text-[var(--pub-text-sec)] hover:text-[var(--pub-text)] transition-colors"
            aria-label="Close"
          >
            &#x2715;
          </button>
        </div>

        <GoogleButton />

        <div className="my-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-[var(--pub-border)]" />
          <span className="text-xs text-[var(--pub-text-sec)]">or</span>
          <div className="h-px flex-1 bg-[var(--pub-border)]" />
        </div>

        <EmailPasswordForm mode={mode} />

        <p className="mt-4 text-center text-sm text-[var(--pub-text-sec)]">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                onClick={() => setMode("register")}
                className="font-medium text-[var(--pub-accent)] hover:underline"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="font-medium text-[var(--pub-accent)] hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
