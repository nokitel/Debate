"use client";

import { trpc } from "@/lib/trpc";
import { useDebateStore } from "@/stores/debate-store";
import { useUIStore } from "@/stores/ui-store";

interface GenerateButtonProps {
  parentId: string;
  debateId: string;
  type: "PRO" | "CON";
}

export function GenerateButton({
  parentId,
  debateId,
  type,
}: GenerateButtonProps): React.JSX.Element {
  const addArgument = useDebateStore((s) => s.addArgument);
  const showPipeline = useUIStore((s) => s.showPipeline);
  const hidePipeline = useUIStore((s) => s.hidePipeline);

  const generateMutation = trpc.argument.generate.useMutation({
    onMutate: () => {
      showPipeline();
    },
    onSuccess: (result) => {
      if (result.argument) {
        addArgument(result.argument);
      }
      hidePipeline();
    },
    onError: () => {
      hidePipeline();
    },
  });

  const isPro = type === "PRO";
  const label = isPro ? "+ Pro" : "+ Con";
  const colorClass = isPro
    ? "border-[var(--color-pro)] text-[var(--color-pro)] hover:bg-green-50 dark:hover:bg-green-950/20"
    : "border-[var(--color-con)] text-[var(--color-con)] hover:bg-red-50 dark:hover:bg-red-950/20";

  return (
    <button
      onClick={() => generateMutation.mutate({ parentId, debateId, type })}
      disabled={generateMutation.isPending}
      className={`rounded border px-2 py-0.5 text-xs font-medium ${colorClass} disabled:opacity-50`}
      data-testid={`generate-${type.toLowerCase()}`}
    >
      {generateMutation.isPending ? "..." : label}
    </button>
  );
}
