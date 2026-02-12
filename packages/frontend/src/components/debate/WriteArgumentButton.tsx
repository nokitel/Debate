"use client";

import { useState, type FormEvent } from "react";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/stores/auth-store";
import { useDebateStore } from "@/stores/debate-store";
import { useUIStore } from "@/stores/ui-store";

interface WriteArgumentButtonProps {
  parentId: string;
  debateId: string;
  type: "PRO" | "CON";
}

/**
 * Standalone button that opens an inline textarea for user-written arguments.
 * Requires authentication — opens login modal if not signed in.
 */
export function WriteArgumentButton({
  parentId,
  debateId,
  type,
}: WriteArgumentButtonProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");

  const user = useAuthStore((s) => s.user);
  const openLoginModal = useUIStore((s) => s.openLoginModal);
  const addArgument = useDebateStore((s) => s.addArgument);

  const submitMutation = trpc.argument.submit.useMutation({
    onSuccess: (argument) => {
      addArgument(argument);
      setText("");
      setIsOpen(false);
    },
  });

  const handleClick = (): void => {
    if (!user) {
      openLoginModal();
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (text.trim().length < 10) return;
    submitMutation.mutate({ parentId, debateId, type, text });
  };

  const isPro = type === "PRO";
  const label = isPro ? "Write Pro" : "Write Con";
  const colorClass = isPro
    ? "border-2 border-green-400 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/20 border-dashed"
    : "border-2 border-red-400 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 border-dashed";
  const borderColor = isPro ? "border-[var(--color-pro)]" : "border-[var(--color-con)]";
  const buttonColor = isPro
    ? "bg-[var(--color-pro)] text-white"
    : "bg-[var(--color-con)] text-white";

  return (
    <div>
      <button
        onClick={handleClick}
        className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${colorClass}`}
        data-testid={`write-${type.toLowerCase()}`}
      >
        {label}
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-2 space-y-1" data-testid="write-argument-form">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Write a ${type.toLowerCase()} argument...`}
            minLength={10}
            maxLength={2000}
            rows={3}
            className={`w-full rounded border ${borderColor} bg-[var(--pub-surface)] px-2 py-1 text-sm text-[var(--pub-text)]`}
            data-testid="write-argument-textarea"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitMutation.isPending || text.trim().length < 10}
              className={`rounded px-3 py-1 text-xs font-medium ${buttonColor} disabled:opacity-50`}
              data-testid="write-argument-submit"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setText("");
              }}
              className="rounded px-3 py-1 text-xs font-medium text-[var(--pub-text-sec)] hover:text-[var(--pub-text)]"
            >
              Cancel
            </button>
          </div>
          {submitMutation.error && (
            <p className="text-xs text-red-500">{submitMutation.error.message}</p>
          )}
        </form>
      )}
    </div>
  );
}
