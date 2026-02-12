import Link from "next/link";

export function Footer(): React.JSX.Element {
  return (
    <footer className="border-t border-[var(--pub-border)] py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <div className="text-sm text-[var(--pub-text-sec)]">
          &copy; {new Date().getFullYear()} Dialectical Engine &middot; dezbatere.ro
        </div>
        <nav className="flex gap-6 text-sm text-[var(--pub-text-sec)]">
          <Link href="/debates" className="hover:text-[var(--pub-text)] transition-colors">
            Debates
          </Link>
          <Link href="/pricing" className="hover:text-[var(--pub-text)] transition-colors">
            Pricing
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--pub-text)] transition-colors"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
