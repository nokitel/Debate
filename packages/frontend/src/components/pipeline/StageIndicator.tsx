import Link from "next/link";

interface StageIndicatorProps {
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  duration?: number;
  detail?: string;
}

/**
 * Pipeline stage indicator with icon, name, status, and optional duration.
 * Dark-themed for the pipeline panel.
 */
export function StageIndicator({
  name,
  status,
  duration,
  detail,
}: StageIndicatorProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 py-1">
      {/* Status icon */}
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        {status === "completed" && (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-green-400" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
          </svg>
        )}
        {status === "running" && (
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--canvas-accent)]" />
        )}
        {status === "pending" && <span className="h-2 w-2 rounded-full bg-slate-600" />}
        {status === "failed" && (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-red-400" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
        )}
        {status === "skipped" && (
          <span className="h-0 w-3 border-t border-dashed border-slate-600" />
        )}
      </span>

      {/* Stage name */}
      <span
        className={`text-xs ${
          status === "completed"
            ? "text-[var(--canvas-text)]"
            : status === "running"
              ? "text-[var(--canvas-accent)] font-medium"
              : status === "skipped"
                ? "text-slate-600 line-through"
                : "text-[var(--canvas-text-sec)]"
        }`}
      >
        {name}
      </span>

      {/* Duration */}
      {duration !== undefined && status === "completed" && (
        <span className="font-mono-data ml-auto text-[10px] text-[var(--canvas-text-sec)]">
          {duration.toFixed(1)}s
        </span>
      )}

      {/* Skipped upgrade CTA */}
      {status === "skipped" && (
        <Link
          href="/pricing"
          className="ml-auto text-[10px] text-[var(--canvas-accent)] hover:underline"
        >
          SKIP
        </Link>
      )}

      {/* Detail (e.g. strategy name) */}
      {detail && status === "completed" && (
        <span className="font-mono-data ml-auto text-[10px] text-[var(--canvas-text-sec)]">
          {detail}
        </span>
      )}
    </div>
  );
}
