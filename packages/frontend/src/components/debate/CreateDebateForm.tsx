"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export function CreateDebateForm(): React.JSX.Element {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thesisText, setThesisText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.debate.create.useMutation({
    onSuccess: (data) => {
      router.push(`/debates/${data.debate.id}`);
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    setError(null);
    createMutation.mutate({
      title,
      description: description || undefined,
      thesisText,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Debate Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={5}
          maxLength={200}
          placeholder="e.g., Should AI be regulated?"
          className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Provide additional context for the debate..."
          className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="thesis" className="block text-sm font-medium">
          Thesis Statement
        </label>
        <textarea
          id="thesis"
          value={thesisText}
          onChange={(e) => setThesisText(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={3}
          placeholder="The main claim to be debated..."
          className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-[var(--color-con)]">{error}</p>}

      <button
        type="submit"
        disabled={createMutation.isPending}
        className="w-full rounded-md bg-[var(--color-thesis)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {createMutation.isPending ? "Creating..." : "Create Debate"}
      </button>
    </form>
  );
}
