interface TournamentRound {
  winner: string;
  loser: string;
}

interface TournamentBracketProps {
  rounds: TournamentRound[];
}

/**
 * Text-based tournament bracket showing win/loss per pair.
 * Renders each round as a row with winner (green) and loser (red).
 */
export function TournamentBracket({ rounds }: TournamentBracketProps): React.JSX.Element {
  if (rounds.length === 0) {
    return <p className="text-xs text-[var(--color-text-secondary)]">No rounds yet</p>;
  }

  return (
    <div className="space-y-0.5">
      {rounds.map((round, i) => (
        <div
          key={`${round.winner}-${round.loser}-${i}`}
          className="flex items-center gap-1 text-xs"
        >
          <span className="font-mono text-[var(--color-text-secondary)]">#{i + 1}</span>
          <span className="text-green-600" title={`Winner: ${round.winner}`}>
            W:{round.winner.slice(0, 8)}
          </span>
          <span className="text-[var(--color-text-secondary)]">vs</span>
          <span className="text-red-500" title={`Loser: ${round.loser}`}>
            L:{round.loser.slice(0, 8)}
          </span>
        </div>
      ))}
    </div>
  );
}
