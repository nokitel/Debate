interface CanvasLayoutProps {
  children: React.ReactNode;
}

/**
 * Dark wrapper for the debate workspace (canvas mode).
 * Full-width edge-to-edge dark background.
 */
export function CanvasLayout({ children }: CanvasLayoutProps): React.JSX.Element {
  return <div className="canvas-page min-h-screen">{children}</div>;
}
