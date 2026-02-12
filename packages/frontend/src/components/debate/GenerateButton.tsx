"use client";

import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/stores/auth-store";
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
  const user = useAuthStore((s) => s.user);
  const openLoginModal = useUIStore((s) => s.openLoginModal);
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
  const label = isPro ? "+ Support" : "+ Challenge";
  const colorClass = isPro
    ? "border-2 border-green-500 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/20"
    : "border-2 border-red-500 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20";

  const isDisabled = generateMutation.isPending || qualityGateActive;

  return (
    <div>
      <button
        onClick={() => {
          if (!user) {
            openLoginModal();
            return;
          }
          generateMutation.mutate({ parentId, debateId, type });
        }}
        disabled={isDisabled}
        className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${colorClass} disabled:opacity-50`}
        data-testid={`generate-${type.toLowerCase()}`}
        title={qualityGateActive ? "AI couldn't find a strong argument" : undefined}
      >
        {generateMutation.isPending ? "..." : label}
      </button>

      {qualityGateActive && <UserInputField parentId={parentId} debateId={debateId} type={type} />}
    </div>
  );
}
