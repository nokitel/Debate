"use client";

/**
 * Apple Sign-In button. Conditionally rendered based on APPLE_CLIENT_ID env var.
 * Stubbed for Phase 1 — requires Apple Developer enrollment.
 */
export function AppleButton(): React.JSX.Element | null {
  // Apple OAuth is conditional on env var
  if (!process.env["NEXT_PUBLIC_APPLE_CLIENT_ID"]) {
    return null;
  }

  return (
    <button
      onClick={() => console.log("Apple OAuth not yet implemented")}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-bg-secondary)]"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
      Continue with Apple
    </button>
  );
}
