interface TournamentRound {
  winner: string;
  loser: string;
}

interface TournamentBracketProps {
  rounds: TournamentRound[];
}

/**
 * Text-based tournament bracket for pipeline panel.
 * Dark-themed with green winners and red losers.
 */
export function TournamentBracket({ rounds }: TournamentBracketProps): React.JSX.Element {
  if (rounds.length === 0) {
    return <p className="text-xs text-[var(--canvas-text-sec)]">No rounds yet</p>;
  }

  return (
    <div className="space-y-0.5">
      {rounds.map((round, i) => (
        <div
          key={`${round.winner}-${round.loser}-${i}`}
          className="flex items-center gap-1.5 text-xs"
        >
          <span className="font-mono-data text-[10px] text-slate-600">#{i + 1}</span>
          <span className="text-green-400" title={`Winner: ${round.winner}`}>
            W:{round.winner.slice(0, 8)}
          </span>
          <span className="text-slate-600">vs</span>
          <span className="text-red-400" title={`Loser: ${round.loser}`}>
            L:{round.loser.slice(0, 8)}
          </span>
        </div>
      ))}
    </div>
  );
}
