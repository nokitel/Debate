interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Warm wrapper for public pages (landing, debates list, pricing, profile).
 * Sets warm cream background and constrains content width.
 */
export function PublicLayout({ children }: PublicLayoutProps): React.JSX.Element {
  return <div className="pub-page min-h-screen">{children}</div>;
}
