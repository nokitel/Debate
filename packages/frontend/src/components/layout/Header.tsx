"use client";

import Link from "next/link";
import { useUIStore } from "@/stores/ui-store";

export function Header(): React.JSX.Element {
  const openLoginModal = useUIStore((s) => s.openLoginModal);

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold">
          Dialectical Engine
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/debates" className="text-sm hover:underline">
            Debates
          </Link>
          <button
            onClick={openLoginModal}
            className="rounded-md bg-[var(--color-thesis)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Sign In
          </button>
        </nav>
      </div>
    </header>
  );
}
