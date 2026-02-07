import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  ArgumentSchema,
  ArgumentType,
  ArgumentSource,
  ReasoningStrategy,
  PipelineTier,
  DebateStatus,
  CreateArgumentInputSchema,
  SubmitUserArgumentInputSchema,
  DebateSchema,
  CreateDebateInputSchema,
  RejectedArgumentSchema,
} from "./debate.js";

const validArgument = {
  id: randomUUID(),
  text: "This is a valid argument that is long enough to pass validation.",
  type: "PRO" as const,
  source: "AI" as const,
  generatedBy: "qwen2.5:latest",
  pipelineTier: "explorer" as const,
  qualityScore: 0.85,
  resilienceScore: null,
  reasoningStrategy: "logical" as const,
  parentId: randomUUID(),
  debateId: randomUUID(),
  depthLevel: 1,
  createdAt: new Date().toISOString(),
};

describe("ArgumentType", () => {
  it("accepts valid values", () => {
    expect(ArgumentType.parse("PRO")).toBe("PRO");
    expect(ArgumentType.parse("CON")).toBe("CON");
    expect(ArgumentType.parse("THESIS")).toBe("THESIS");
  });

  it("rejects invalid values", () => {
    expect(() => ArgumentType.parse("NEUTRAL")).toThrow();
  });
});

describe("ArgumentSource", () => {
  it("accepts valid values", () => {
    expect(ArgumentSource.parse("AI")).toBe("AI");
    expect(ArgumentSource.parse("USER")).toBe("USER");
  });
});

describe("ReasoningStrategy", () => {
  it("accepts all strategy values", () => {
    const strategies = [
      "logical",
      "empirical",
      "ethical",
      "analogical",
      "precedent",
      "consequentialist",
      "definitional",
    ];
    for (const s of strategies) {
      expect(ReasoningStrategy.parse(s)).toBe(s);
    }
  });
});

describe("PipelineTier", () => {
  it("accepts all tiers", () => {
    for (const tier of ["explorer", "thinker", "scholar", "institution"]) {
      expect(PipelineTier.parse(tier)).toBe(tier);
    }
  });
});

describe("DebateStatus", () => {
  it("accepts active and archived", () => {
    expect(DebateStatus.parse("active")).toBe("active");
    expect(DebateStatus.parse("archived")).toBe("archived");
  });
});

describe("ArgumentSchema", () => {
  it("parses a valid argument", () => {
    const result = ArgumentSchema.parse(validArgument);
    expect(result.id).toBe(validArgument.id);
    expect(result.qualityScore).toBe(0.85);
  });

  it("applies default for evidenceSources", () => {
    const result = ArgumentSchema.parse(validArgument);
    expect(result.evidenceSources).toEqual([]);
  });

  it("accepts optional embedding", () => {
    const withEmbedding = { ...validArgument, embedding: [0.1, 0.2, 0.3] };
    const result = ArgumentSchema.parse(withEmbedding);
    expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
  });

  it("rejects text shorter than 10 characters", () => {
    expect(() => ArgumentSchema.parse({ ...validArgument, text: "Short" })).toThrow();
  });

  it("rejects qualityScore > 1", () => {
    expect(() => ArgumentSchema.parse({ ...validArgument, qualityScore: 1.5 })).toThrow();
  });

  it("rejects qualityScore < 0", () => {
    expect(() => ArgumentSchema.parse({ ...validArgument, qualityScore: -0.1 })).toThrow();
  });

  it("rejects invalid UUID for id", () => {
    expect(() => ArgumentSchema.parse({ ...validArgument, id: "not-a-uuid" })).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => ArgumentSchema.parse({})).toThrow();
  });

  it("accepts null resilienceScore", () => {
    const result = ArgumentSchema.parse(validArgument);
    expect(result.resilienceScore).toBeNull();
  });

  it("accepts numeric resilienceScore", () => {
    const result = ArgumentSchema.parse({ ...validArgument, resilienceScore: 0.75 });
    expect(result.resilienceScore).toBe(0.75);
  });

  it("accepts null parentId for thesis", () => {
    const thesis = { ...validArgument, type: "THESIS", parentId: null };
    const result = ArgumentSchema.parse(thesis);
    expect(result.parentId).toBeNull();
  });
});

describe("CreateArgumentInputSchema", () => {
  it("parses valid input", () => {
    const input = {
      parentId: randomUUID(),
      type: "PRO" as const,
      debateId: randomUUID(),
    };
    const result = CreateArgumentInputSchema.parse(input);
    expect(result.type).toBe("PRO");
  });

  it("rejects THESIS type", () => {
    const input = {
      parentId: randomUUID(),
      type: "THESIS",
      debateId: randomUUID(),
    };
    expect(() => CreateArgumentInputSchema.parse(input)).toThrow();
  });
});

describe("SubmitUserArgumentInputSchema", () => {
  it("parses valid user submission", () => {
    const input = {
      parentId: randomUUID(),
      type: "CON" as const,
      debateId: randomUUID(),
      text: "A user-submitted counter argument to the thesis.",
    };
    const result = SubmitUserArgumentInputSchema.parse(input);
    expect(result.text).toContain("user-submitted");
  });

  it("rejects text shorter than 10 chars", () => {
    const input = {
      parentId: randomUUID(),
      type: "PRO" as const,
      debateId: randomUUID(),
      text: "Too short",
    };
    expect(() => SubmitUserArgumentInputSchema.parse(input)).toThrow();
  });
});

describe("DebateSchema", () => {
  it("parses a valid debate", () => {
    const now = new Date().toISOString();
    const debate = {
      id: randomUUID(),
      title: "Should AI be regulated?",
      createdBy: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const result = DebateSchema.parse(debate);
    expect(result.isPublic).toBe(true);
    expect(result.totalNodes).toBe(0);
    expect(result.status).toBe("active");
    expect(result.description).toBe("");
  });

  it("rejects title shorter than 5 characters", () => {
    const now = new Date().toISOString();
    expect(() =>
      DebateSchema.parse({
        id: randomUUID(),
        title: "Hi",
        createdBy: randomUUID(),
        createdAt: now,
        updatedAt: now,
      }),
    ).toThrow();
  });
});

describe("CreateDebateInputSchema", () => {
  it("parses valid creation input", () => {
    const input = {
      title: "Is blockchain useful?",
      thesisText: "Blockchain technology provides genuine value beyond speculation.",
    };
    const result = CreateDebateInputSchema.parse(input);
    expect(result.description).toBeUndefined();
  });

  it("accepts optional description", () => {
    const input = {
      title: "Is blockchain useful?",
      description: "Examining real-world blockchain applications.",
      thesisText: "Blockchain technology provides genuine value beyond speculation.",
    };
    const result = CreateDebateInputSchema.parse(input);
    expect(result.description).toBe("Examining real-world blockchain applications.");
  });
});

describe("RejectedArgumentSchema", () => {
  it("parses valid rejected argument", () => {
    const rejected = {
      id: randomUUID(),
      text: "An argument that was rejected during the pipeline.",
      rejectionReason: "Below consensus threshold",
      failedAtStage: "consensus" as const,
      qualityScore: 0.4,
      createdAt: new Date().toISOString(),
    };
    const result = RejectedArgumentSchema.parse(rejected);
    expect(result.failedAtStage).toBe("consensus");
  });

  it("rejects invalid failedAtStage", () => {
    expect(() =>
      RejectedArgumentSchema.parse({
        id: randomUUID(),
        text: "Some text",
        rejectionReason: "Bad",
        failedAtStage: "generation",
        qualityScore: 0.3,
        createdAt: new Date().toISOString(),
      }),
    ).toThrow();
  });
});
