export interface ReasoningStrategyInfo {
  readonly name: string;
  readonly description: string;
}

export const REASONING_STRATEGIES: Readonly<Record<string, ReasoningStrategyInfo>> = {
  logical: {
    name: "Logical",
    description: "Uses formal logic, syllogisms, and deductive/inductive reasoning",
  },
  empirical: {
    name: "Empirical",
    description: "Relies on data, statistics, studies, and observable evidence",
  },
  ethical: {
    name: "Ethical",
    description: "Appeals to moral principles, rights, duties, and values",
  },
  analogical: {
    name: "Analogical",
    description: "Draws parallels from similar situations or domains",
  },
  precedent: {
    name: "Precedent",
    description: "References historical examples, legal precedent, or established patterns",
  },
  consequentialist: {
    name: "Consequentialist",
    description: "Evaluates arguments by their outcomes and consequences",
  },
  definitional: {
    name: "Definitional",
    description: "Argues based on definitions, classifications, and semantic boundaries",
  },
} as const;
