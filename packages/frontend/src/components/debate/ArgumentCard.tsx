"use client";

import type { Argument } from "@dialectical/shared";
import { GenerateButton } from "./GenerateButton";
import { CollapsibleRejected } from "./CollapsibleRejected";

interface ArgumentCardProps {
  argument: Argument;
  children?: React.ReactNode;
}

const TYPE_COLORS: Record<string, string> = {
  THESIS: "border-l-[var(--color-thesis)] bg-blue-50 dark:bg-blue-950/20",
  PRO: "border-l-[var(--color-pro)] bg-green-50 dark:bg-green-950/20",
  CON: "border-l-[var(--color-con)] bg-red-50 dark:bg-red-950/20",
};

const TYPE_LABELS: Record<string, string> = {
  THESIS: "Thesis",
  PRO: "Pro",
  CON: "Con",
};

export function ArgumentCard({ argument, children }: ArgumentCardProps): React.JSX.Element {
  const colorClass = TYPE_COLORS[argument.type] ?? "";
  const label = TYPE_LABELS[argument.type] ?? argument.type;

  return (
    <div className={`rounded-md border-l-4 p-3 ${colorClass}`} data-argument-id={argument.id}>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-bold uppercase">{label}</span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {argument.source === "AI" ? `AI (${argument.generatedBy})` : "User"}
        </span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {argument.reasoningStrategy}
        </span>
      </div>
      <p className="text-sm">{argument.text}</p>
      <div className="mt-2 flex gap-2">
        <GenerateButton parentId={argument.id} debateId={argument.debateId} type="PRO" />
        <GenerateButton parentId={argument.id} debateId={argument.debateId} type="CON" />
      </div>
      <CollapsibleRejected parentId={argument.id} debateId={argument.debateId} />
      {children && <div className="ml-4 mt-3 space-y-2">{children}</div>}
    </div>
  );
}
