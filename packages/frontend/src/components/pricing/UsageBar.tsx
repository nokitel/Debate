interface UsageBarProps {
  /** Number of arguments used this month. */
  used: number;
  /** Monthly argument limit, or null for unlimited. */
  limit: number | null;
}

/**
 * Progress bar showing monthly argument usage.
 */
export function UsageBar({ used, limit }: UsageBarProps): React.JSX.Element {
  if (limit === null) {
    return (
      <div data-testid="usage-bar">
        <div className="flex justify-between text-sm">
          <span>{used} arguments used</span>
          <span className="text-[var(--color-text-secondary)]">Unlimited</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div className="h-full rounded-full bg-green-500" style={{ width: "5%" }} />
        </div>
      </div>
    );
  }

  const percentage = Math.min(100, Math.round((used / limit) * 100));
  const isNearLimit = percentage >= 80;
  const barColor = isNearLimit ? "bg-orange-500" : "bg-blue-500";

  return (
    <div data-testid="usage-bar">
      <div className="flex justify-between text-sm">
        <span>
          {used} / {limit} arguments
        </span>
        <span className="text-[var(--color-text-secondary)]">{percentage}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
