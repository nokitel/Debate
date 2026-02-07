interface ConsensusScoresProps {
  novelty: number;
  relevance: number;
  logicalStrength: number;
}

const THRESHOLD = 0.6;

function ScoreBar({ label, value }: { label: string; value: number }): React.JSX.Element {
  const pct = Math.round(value * 100);
  const isStrong = value > THRESHOLD;
  const barColor = isStrong ? "bg-green-500" : "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-xs text-[var(--color-text-secondary)]">{label}</span>
      <div className="flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span
        className={`w-8 text-right text-xs font-medium ${isStrong ? "text-green-600" : "text-red-500"}`}
      >
        {pct}%
      </span>
    </div>
  );
}

/**
 * Horizontal bar charts for consensus scoring dimensions.
 * Green if above 0.6 threshold, red if at or below.
 */
export function ConsensusScores({
  novelty,
  relevance,
  logicalStrength,
}: ConsensusScoresProps): React.JSX.Element {
  return (
    <div className="space-y-1">
      <ScoreBar label="Novelty" value={novelty} />
      <ScoreBar label="Relevance" value={relevance} />
      <ScoreBar label="Strength" value={logicalStrength} />
    </div>
  );
}
