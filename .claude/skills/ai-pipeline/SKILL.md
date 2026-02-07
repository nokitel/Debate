---
name: ai-pipeline
description: LLM orchestration with Vercel AI SDK, Ollama local models, and cloud providers
globs: ["packages/ai-pipeline/**"]
---

# AI Pipeline Development Guide

## Architecture
- Vercel AI SDK v6 for ALL model interactions
- Ollama provider (`ollama-ai-provider`) for local models
- `@ai-sdk/anthropic` for Claude, `@ai-sdk/openai` for GPT
- Each stage is a pure async function: `(input, emit) => Promise<output>`
- Orchestrator composes stages sequentially with SSE emission
- **LOCAL MODELS LOADED ONE AT A TIME** — sequential rotation prioritizes diversity & quality over speed

## Local Model Pool

Models are loaded sequentially (one at a time) and rotated for diversity. This list evolves:

```typescript
import { LOCAL_MODEL_POOL } from "@dialectical/shared";
// Current pool: qwen2.5, mistral-nemo, glm4-9b-chat, gpt-oss,
//               gemma2, deepseek-r1:8b-distill-q4, nemotron-nano
// Set OLLAMA_MAX_LOADED_MODELS=1 in environment
```

## Core Pattern: generateObject with Zod

ALWAYS use `generateObject` for structured LLM output:

```typescript
import { generateObject } from "ai";
import { ollama } from "ollama-ai-provider";
import { z } from "zod";

const result = await generateObject({
  model: ollama("qwen2.5:latest"),
  schema: z.object({
    argument: z.string().describe("The argument text"),
    strategy: z.string().describe("The reasoning strategy used"),
    confidence: z.number().min(0).max(1),
  }),
  prompt: buildGenerationPrompt(context),
  maxTokens: 1000,
});
// result.object is fully typed — no parsing needed
```

## Sequential Execution Pattern (Voting)

```typescript
// Tournament voting — models loaded one at a time for diversity
const votes: VoteResult[] = [];
for (const model of selectedModels) {
  const vote = await generateObject({
    model: ollama(model),
    schema: z.object({
      winner: z.enum(["A", "B"]),
      reason: z.string().max(200),
    }),
    prompt: `Compare these arguments and pick the stronger one:
      A: ${pair.a.text}
      B: ${pair.b.text}`,
  });
  votes.push(vote.object);
  // Ollama automatically unloads previous model when new one loads
}
```

## Model Rotation (Sequential — One at a Time)

Mac Mini M4 16GB loads ONE model at a time. Diversity and quality over speed.

```typescript
import { LOCAL_MODEL_POOL } from "@dialectical/shared";

// Stage 3: Generate with each model sequentially
async function diverseGeneration(strategies: string[], emit: Emit) {
  const results: CandidateArgument[] = [];
  for (let i = 0; i < strategies.length; i++) {
    const model = LOCAL_MODEL_POOL[i % LOCAL_MODEL_POOL.length];
    // Ollama auto-unloads previous model, loads this one
    results.push(await generateCandidate(model, strategies[i]));
    emit({ type: "candidate-generated", modelName: model, strategy: strategies[i] });
  }
  return results;
}
```

## Stage Function Signature

EVERY stage follows this pattern:

```typescript
import { SSEEvent } from "@dialectical/shared";

type Emit = (event: SSEEvent) => void;

interface StageInput { /* stage-specific */ }
interface StageOutput { /* stage-specific */ }

export async function runStage(
  input: StageInput,
  emit: Emit,
  config: PipelineConfig
): Promise<StageOutput> {
  const startTime = Date.now();
  emit({ type: "stage-start", stage: "tournament" });

  try {
    // ... stage logic ...
    const durationMs = Date.now() - startTime;
    emit({ type: "stage-complete", stage: "tournament", durationMs });
    return output;
  } catch (error) {
    emit({ type: "stage-failed", stage: "tournament", error: String(error) });
    throw error;
  }
}
```

## Prompt Management

ALL prompts live in `src/prompts/` as template functions:

```typescript
// src/prompts/generation.ts
export function buildGenerationPrompt(context: DebateContext, strategy: string, type: "PRO" | "CON"): string {
  return `You are generating a ${type} argument for a structured debate.

THESIS: ${context.thesis}

ANCESTOR CHAIN (root → parent):
${context.ancestors.map((a, i) => `${"  ".repeat(i)}${a.type}: ${a.text}`).join("\n")}

EXISTING SIBLING ARGUMENTS (avoid duplicating these):
${context.siblings.map(s => `- ${s.type}: ${s.text}`).join("\n")}

REASONING STRATEGY: Use ${strategy} reasoning.

Generate ONE strong ${type} argument. Be specific, concise, and novel.`;
}
```

## Constraints
- Mac Mini M4 16GB: ONE model loaded at a time (`OLLAMA_MAX_LOADED_MODELS=1`)
- Model pool (evolving): qwen2.5, mistral-nemo, glm4-9b-chat, gpt-oss, gemma2, deepseek-r1:8b-distill-q4, nemotron-nano
- Timeouts: 60s per model call, 300s total pipeline (generous for sequential loading)
- Embedding model: nomic-embed-text (384 dimensions)
- All schemas from `@dialectical/shared`
- No LangChain imports — Vercel AI SDK only

## Testing
- Mock Ollama HTTP API with `msw` (Mock Service Worker)
- Mock cloud providers similarly
- Test Elo calculations with known inputs/outputs
- Test consensus logic: 0/5, 2/5, 3/5, 5/5 agreement scenarios
- Test dedup: identical, similar (0.86), and distinct (0.5) pairs
