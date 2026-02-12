"use client";

import type { Argument } from "@dialectical/shared";

interface SourceCitationProps {
  argument: Argument;
}

/**
 * Extract the hostname from a URL for display.
 */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Get the Google Favicon API URL for a given source URL.
 */
function getFaviconUrl(url: string): string {
  const hostname = getHostname(url);
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;
}

/**
 * Collapsible citation links below argument text.
 * Warm-themed with amber accent for upgrade CTA.
 */
export function SourceCitation({ argument }: SourceCitationProps): React.JSX.Element | null {
  const hasSources = argument.evidenceSources.length > 0;
  const isFreeTier = argument.pipelineTier === "explorer";

  // Free tier with no sources: show upgrade CTA
  if (!hasSources && isFreeTier && argument.source === "AI") {
    return (
      <div className="mt-2" data-testid="upgrade-cta">
        <a href="/pricing" className="text-xs font-medium text-[var(--pub-accent)] hover:underline">
          Upgrade for evidence-backed arguments &rarr;
        </a>
      </div>
    );
  }

  if (!hasSources) {
    return null;
  }

  return (
    <details open className="mt-3" data-testid="source-citation">
      <summary className="cursor-pointer text-xs font-medium text-[var(--pub-text-sec)]">
        Sources ({argument.evidenceSources.length})
      </summary>
      <ul className="mt-1.5 space-y-1">
        {argument.evidenceSources.map((url) => (
          <li key={url} className="flex items-center gap-1.5">
            <img src={getFaviconUrl(url)} alt="" width={16} height={16} className="inline-block" />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--pub-accent)] hover:underline"
            >
              {getHostname(url)}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
