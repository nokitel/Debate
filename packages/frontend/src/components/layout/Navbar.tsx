"use client";

import Link from "next/link";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { trpc } from "@/lib/trpc";

interface NavbarProps {
  variant?: "warm" | "dark";
}

/**
 * Top navigation bar with two visual modes.
 * "warm" — warm cream for public pages.
 * "dark" — dark for the debate canvas workspace.
 */
export function Navbar({ variant = "warm" }: NavbarProps): React.JSX.Element {
  const openLoginModal = useUIStore((s) => s.openLoginModal);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const utils = trpc.useUtils();

  const isWarm = variant === "warm";

  const bgClass = isWarm
    ? "bg-[var(--pub-surface)] border-b border-[var(--pub-border)]"
    : "bg-[var(--canvas-surface)] border-b border-[var(--canvas-border)]";

  const textClass = isWarm ? "text-[var(--pub-text)]" : "text-[var(--canvas-text)]";

  const linkHoverClass = isWarm
    ? "text-[var(--pub-text-sec)] hover:text-[var(--pub-text)]"
    : "text-[var(--canvas-text-sec)] hover:text-[var(--canvas-text)]";

  const ctaClass = isWarm
    ? "bg-[var(--pub-accent)] text-white hover:bg-[var(--pub-accent-hover)]"
    : "bg-[var(--canvas-accent)] text-white hover:bg-indigo-500";

  const handleSignOut = (): void => {
    logout();
    void utils.invalidate();
  };

  return (
    <header className={bgClass}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className={`font-serif-display text-lg font-bold ${textClass}`}>
          Dialectical Engine
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/debates"
            className={`text-sm font-medium transition-colors ${linkHoverClass}`}
          >
            Debates
          </Link>
          <Link
            href="/pricing"
            className={`text-sm font-medium transition-colors ${linkHoverClass}`}
          >
            Pricing
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${textClass}`}>{user.displayName}</span>
              <button
                onClick={handleSignOut}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isWarm
                    ? "border border-[var(--pub-border)] text-[var(--pub-text-sec)] hover:bg-[var(--pub-border)]"
                    : "border border-[var(--canvas-border)] text-[var(--canvas-text-sec)] hover:bg-[var(--canvas-border)]"
                }`}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${ctaClass}`}
            >
              Sign In
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
