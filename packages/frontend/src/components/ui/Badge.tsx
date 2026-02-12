type BadgeVariant = "thesis" | "pro" | "con" | "score-green" | "score-amber" | "score-red" | "mono";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  thesis: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  pro: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  con: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "score-green": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "score-amber": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "score-red": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  mono: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 font-mono-data text-xs",
};

/**
 * Get the appropriate score variant based on a percentage value (0-100).
 * @param pct - Score as percentage (0-100)
 * @returns Badge variant name
 */
export function getScoreVariant(pct: number): "score-green" | "score-amber" | "score-red" {
  if (pct >= 70) return "score-green";
  if (pct >= 40) return "score-amber";
  return "score-red";
}

/**
 * Type, score, or metadata badge.
 * @param variant - Visual style: thesis (blue), pro (green), con (red), score-*, mono
 */
export function Badge({ variant, children, className = "" }: BadgeProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
