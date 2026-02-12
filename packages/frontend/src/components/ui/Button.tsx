import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "canvas" | "support" | "challenge";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--pub-accent)] text-white hover:bg-[var(--pub-accent-hover)] rounded-lg px-6 py-3 font-medium",
  secondary:
    "border border-[var(--pub-border)] text-[var(--pub-text)] hover:bg-[var(--pub-section)] rounded-lg px-6 py-3 font-medium",
  ghost: "text-[var(--pub-text)] hover:bg-[var(--pub-section)] rounded-lg px-4 py-2 font-medium",
  canvas: "bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg px-6 py-3 font-medium",
  support:
    "border-2 border-green-500 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/20 rounded-lg px-4 py-2 text-sm font-medium",
  challenge:
    "border-2 border-red-500 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 rounded-lg px-4 py-2 text-sm font-medium",
};

/**
 * Reusable button with design-system variants.
 * @param variant - Visual variant: primary (amber), secondary, ghost, canvas (indigo), support (green), challenge (red)
 */
export function Button({
  variant = "primary",
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      className={`inline-flex items-center justify-center transition-colors ${VARIANT_CLASSES[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
