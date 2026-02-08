import Link from "next/link";

export function Footer(): React.JSX.Element {
  return (
    <footer className="border-t border-[var(--color-border)] py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 sm:flex-row sm:justify-between">
        <div className="text-sm text-[var(--color-text-secondary)]">
          &copy; {new Date().getFullYear()} Dialectical Engine. All rights reserved.
        </div>
        <nav className="flex gap-6 text-sm text-[var(--color-text-secondary)]">
          <Link href="/debates" className="hover:underline">
            Debates
          </Link>
          <Link href="/pricing" className="hover:underline">
            Pricing
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
