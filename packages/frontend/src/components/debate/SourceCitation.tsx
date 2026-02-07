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
 * Shows source URLs with favicons and hostnames.
 * When no sources exist for a free-tier argument, shows an upgrade CTA.
 */
export function SourceCitation({ argument }: SourceCitationProps): React.JSX.Element | null {
  const hasSources = argument.evidenceSources.length > 0;
  const isFreeTier = argument.pipelineTier === "explorer";

  // Free tier with no sources: show upgrade CTA
  if (!hasSources && isFreeTier && argument.source === "AI") {
    return (
      <div className="mt-2" data-testid="upgrade-cta">
        <a
          href="/pricing"
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Upgrade for evidence-backed arguments →
        </a>
      </div>
    );
  }

  // No sources and not free tier (or user-submitted): don't show anything
  if (!hasSources) {
    return null;
  }

  return (
    <details open className="mt-2" data-testid="source-citation">
      <summary className="cursor-pointer text-xs font-medium text-[var(--color-text-secondary)]">
        Sources ({argument.evidenceSources.length})
      </summary>
      <ul className="mt-1 space-y-1">
        {argument.evidenceSources.map((url) => (
          <li key={url} className="flex items-center gap-1.5">
            <img src={getFaviconUrl(url)} alt="" width={16} height={16} className="inline-block" />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              {getHostname(url)}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
