"use client";

import { useState, type FormEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useUIStore } from "@/stores/ui-store";

interface EmailPasswordFormProps {
  mode: "login" | "register";
}

export function EmailPasswordForm({ mode }: EmailPasswordFormProps): React.JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const closeLoginModal = useUIStore((s) => s.closeLoginModal);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      closeLoginModal();
      window.location.reload();
    },
    onError: (err) => setError(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      closeLoginModal();
      window.location.reload();
    },
    onError: (err) => setError(err.message),
  });

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    setError(null);

    if (mode === "login") {
      loginMutation.mutate({ provider: "email", email, password });
    } else {
      registerMutation.mutate({ provider: "email", email, password, displayName });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {mode === "register" && (
        <input
          type="text"
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={1}
          maxLength={100}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      )}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-[var(--color-con)]">{error}</p>}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-[var(--color-thesis)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
      </button>
    </form>
  );
}
