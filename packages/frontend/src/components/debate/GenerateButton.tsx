"use client";

import { trpc } from "@/lib/trpc";
import { useDebateStore } from "@/stores/debate-store";
import { useUIStore } from "@/stores/ui-store";
import { UserInputField } from "./UserInputField";

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
  const setQualityGate = useDebateStore((s) => s.setQualityGate);
  const qualityGates = useDebateStore((s) => s.qualityGates);
  const showPipeline = useUIStore((s) => s.showPipeline);
  const hidePipeline = useUIStore((s) => s.hidePipeline);

  const gateState = qualityGates.get(parentId);
  const qualityGateActive = type === "PRO" ? gateState?.pro === true : gateState?.con === true;

  const generateMutation = trpc.argument.generate.useMutation({
    onMutate: () => {
      showPipeline();
    },
    onSuccess: (result) => {
      if (result.argument) {
        addArgument(result.argument);
      }
      if (result.qualityGateTriggered) {
        setQualityGate(parentId, type, true);
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

  const isDisabled = generateMutation.isPending || qualityGateActive;

  return (
    <div>
      <button
        onClick={() => generateMutation.mutate({ parentId, debateId, type })}
        disabled={isDisabled}
        className={`rounded border px-2 py-0.5 text-xs font-medium ${colorClass} disabled:opacity-50`}
        data-testid={`generate-${type.toLowerCase()}`}
        title={qualityGateActive ? "AI couldn't find a strong argument" : undefined}
      >
        {generateMutation.isPending ? "..." : label}
      </button>

      {qualityGateActive && <UserInputField parentId={parentId} debateId={debateId} type={type} />}
    </div>
  );
}
