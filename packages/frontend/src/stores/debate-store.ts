import { create } from "zustand";
import type { Debate, Argument } from "@dialectical/shared";

interface DebateState {
  /** Currently loaded debate. */
  debate: Debate | null;
  /** All arguments in the current debate, keyed by ID. */
  arguments: Map<string, Argument>;
  /** Whether the debate data is loading. */
  isLoading: boolean;

  // Actions
  setDebate: (debate: Debate) => void;
  setArguments: (args: Argument[]) => void;
  addArgument: (arg: Argument) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useDebateStore = create<DebateState>((set) => ({
  debate: null,
  arguments: new Map(),
  isLoading: false,

  setDebate: (debate) => set({ debate }),

  setArguments: (args) =>
    set({
      arguments: new Map(args.map((a) => [a.id, a])),
    }),

  addArgument: (arg) =>
    set((state) => {
      const next = new Map(state.arguments);
      next.set(arg.id, arg);
      return { arguments: next };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () =>
    set({
      debate: null,
      arguments: new Map(),
      isLoading: false,
    }),
}));

/** Get children of a specific argument. */
export function getChildren(args: Map<string, Argument>, parentId: string): Argument[] {
  const children: Argument[] = [];
  for (const arg of args.values()) {
    if (arg.parentId === parentId) {
      children.push(arg);
    }
  }
  return children.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Get the thesis argument. */
export function getThesis(args: Map<string, Argument>): Argument | undefined {
  for (const arg of args.values()) {
    if (arg.type === "THESIS") {
      return arg;
    }
  }
  return undefined;
}
