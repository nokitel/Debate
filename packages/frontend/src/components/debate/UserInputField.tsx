"use client";

import { useState, type FormEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useDebateStore } from "@/stores/debate-store";

interface UserInputFieldProps {
  parentId: string;
  debateId: string;
  type: "PRO" | "CON";
}

/**
 * Text area for user argument submission when quality gate is active.
 * Slides in below the disabled Generate button.
 */
export function UserInputField({
  parentId,
  debateId,
  type,
}: UserInputFieldProps): React.JSX.Element {
  const [text, setText] = useState("");
  const addArgument = useDebateStore((s) => s.addArgument);
  const setQualityGate = useDebateStore((s) => s.setQualityGate);

  const submitMutation = trpc.argument.submit.useMutation({
    onSuccess: (argument) => {
      addArgument(argument);
      setQualityGate(parentId, type, false);
      setText("");
    },
  });

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (text.trim().length < 10) return;
    submitMutation.mutate({ parentId, debateId, type, text });
  };

  const isPro = type === "PRO";
  const borderColor = isPro ? "border-[var(--color-pro)]" : "border-[var(--color-con)]";
  const buttonColor = isPro
    ? "bg-[var(--color-pro)] text-white"
    : "bg-[var(--color-con)] text-white";

  return (
    <form onSubmit={handleSubmit} className="mt-1 space-y-1">
      <p className="text-xs text-[var(--color-text-secondary)]">
        AI couldn&apos;t find a strong argument. Write your own:
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Write a ${type.toLowerCase()} argument...`}
        minLength={10}
        maxLength={2000}
        rows={2}
        className={`w-full rounded border ${borderColor} bg-[var(--color-bg)] px-2 py-1 text-xs`}
        data-testid="user-input-field"
      />
      <button
        type="submit"
        disabled={submitMutation.isPending || text.trim().length < 10}
        className={`rounded px-2 py-0.5 text-xs font-medium ${buttonColor} disabled:opacity-50`}
        data-testid="user-submit-button"
      >
        {submitMutation.isPending ? "Submitting..." : "Submit"}
      </button>
      {submitMutation.error && (
        <p className="text-xs text-red-500">{submitMutation.error.message}</p>
      )}
    </form>
  );
}
