interface ProgressBarProps {
  /** Progress value from 0 to 100. */
  value: number;
  /** Whether to show the percentage label. */
  showLabel?: boolean;
}

/**
 * Pipeline progress bar with indigo gradient.
 */
export function ProgressBar({ value, showLabel = true }: ProgressBarProps): React.JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 overflow-hidden rounded-full bg-slate-700/50"
        style={{ height: "8px" }}
      >
        <div
          className="h-full rounded-full progress-indigo transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="font-mono-data text-xs text-[var(--canvas-text-sec)]">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
