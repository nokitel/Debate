interface ConsensusScoresProps {
  novelty: number;
  relevance: number;
  logicalStrength: number;
}

const THRESHOLD = 0.6;

function PipelineScoreBar({ label, value }: { label: string; value: number }): React.JSX.Element {
  const pct = Math.round(value * 100);
  const isStrong = value > THRESHOLD;
  const barColor = isStrong ? "bg-green-500" : "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-[var(--canvas-text-sec)]">{label}</span>
      <div className="flex-1 rounded-full bg-slate-700">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span
        className={`font-mono-data w-8 text-right text-[11px] font-medium ${isStrong ? "text-green-400" : "text-red-400"}`}
      >
        {pct}%
      </span>
    </div>
  );
}

/**
 * Horizontal bar charts for consensus scoring dimensions.
 * Dark-themed for pipeline panel. Green above 60%, red at or below.
 */
export function ConsensusScores({
  novelty,
  relevance,
  logicalStrength,
}: ConsensusScoresProps): React.JSX.Element {
  return (
    <div className="space-y-1">
      <PipelineScoreBar label="Novelty" value={novelty} />
      <PipelineScoreBar label="Relevance" value={relevance} />
      <PipelineScoreBar label="Strength" value={logicalStrength} />
    </div>
  );
}
