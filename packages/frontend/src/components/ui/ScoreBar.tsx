interface ScoreBarProps {
  /** Score value from 0 to 1. */
  value: number;
  /** Optional label displayed to the left. */
  label?: string;
  /** Whether to show the percentage text. */
  showPercent?: boolean;
  /** Height of the bar in pixels. Defaults to 4. */
  height?: number;
}

/**
 * Get gradient class by score value.
 */
function getGradientClass(value: number): string {
  if (value >= 0.7) return "score-gradient-green";
  if (value >= 0.4) return "score-gradient-amber";
  return "score-gradient-red";
}

/**
 * Thin colored progress bar for quality/resilience scores.
 * Color auto-adjusts: green >= 70%, amber >= 40%, red < 40%.
 */
export function ScoreBar({
  value,
  label,
  showPercent = true,
  height = 4,
}: ScoreBarProps): React.JSX.Element {
  const pct = Math.round(value * 100);
  const gradientClass = getGradientClass(value);

  return (
    <div className="flex items-center gap-2">
      {label && <span className="w-20 shrink-0 text-xs text-[var(--pub-text-sec)]">{label}</span>}
      <div
        className="flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-slate-700"
        style={{ height: `${height}px` }}
      >
        <div className={`h-full rounded-full ${gradientClass}`} style={{ width: `${pct}%` }} />
      </div>
      {showPercent && (
        <span className="font-mono-data w-10 shrink-0 text-right text-xs">{pct}%</span>
      )}
    </div>
  );
}
