---
name: frontend
description: Next.js 15 App Router with React Flow tree visualization, Zustand state, and MultiversX wallet integration
globs: ["packages/frontend/**"]
---

# Frontend Development Guide

## Stack
- Next.js 15 App Router (NOT Pages Router)
- React 19 with Server Components
- React Flow v12 for tree visualization
- Zustand v5 for client state
- Tailwind CSS v4 for styling
- tRPC client for type-safe API calls
- `@multiversx/sdk-dapp` v5 for wallet connection

## App Router Patterns

### Server Components (default)
Pages and layouts are Server Components by default. Use for SSR/SSG.

**IMPORTANT:** In Next.js 15, dynamic route `params` are `Promise` and must be awaited:
```typescript
// app/debates/[id]/page.tsx — params are Promise in Next.js 15
interface DebatePageProps {
  params: Promise<{ id: string }>;
}

export default async function DebatePage({ params }: DebatePageProps) {
  const { id } = await params;
  return <DebateView debateId={id} />;
}
```

### Client Components (interactive)
Add `"use client"` directive for interactivity:

```typescript
// components/debate/GenerateButton.tsx
"use client";
import { trpc } from "@/lib/trpc";

export function GenerateButton({ parentId, debateId }: Props) {
  const generate = trpc.argument.generate.useMutation();
  return (
    <button
      onClick={() => generate.mutate({ parentId, debateId, type: "PRO" })}
      disabled={generate.isPending}
    >
      {generate.isPending ? "Generating..." : "Generate PRO"}
    </button>
  );
}
```

## SSE Hook Pattern

Backend uses named events (`event: stage-start\ndata: ...\n\n`), so use `addEventListener` per event type instead of `onmessage`:

```typescript
// hooks/usePipelineSSE.ts
"use client";
import { useState, useEffect } from "react";
import type { SSEEvent } from "@dialectical/shared";

export function usePipelineSSE(options: { debateId: string; argumentId: string; enabled: boolean }) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!options.enabled) return;
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pipeline/${options.debateId}/${options.argumentId}/stream`;
    const es = new EventSource(url);

    es.onopen = () => setIsConnected(true);

    // Listen for each named event type individually
    const types = ["stage-start", "stage-complete", "stage-failed",
                   "candidate-generated", "pipeline-complete", "pipeline-error"];
    for (const type of types) {
      es.addEventListener(type, (e) => {
        const data = JSON.parse((e as MessageEvent).data) as SSEEvent;
        setEvents(prev => [...prev, data]);
        if (type === "pipeline-complete" || type === "pipeline-error") {
          es.close();
          setIsConnected(false);
        }
      });
    }

    es.onerror = () => { setIsConnected(false); es.close(); };
    return () => es.close();
  }, [options.debateId, options.argumentId, options.enabled]);

  return { events, isConnected };
}
```

## React Flow Tree Pattern

```typescript
// components/debate/ArgumentTreeGraph.tsx
"use client";
import ReactFlow, { type Node, type Edge, MiniMap, Controls } from "reactflow";
import dagre from "dagre";
import { ArgumentNode } from "./ArgumentNode";

const nodeTypes = { argument: ArgumentNode };

export function ArgumentTreeGraph({ arguments }: Props) {
  const { nodes, edges } = useMemo(
    () => layoutWithDagre(arguments),
    [arguments]
  );
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.1}
      maxZoom={2}
    >
      <MiniMap />
      <Controls />
    </ReactFlow>
  );
}
```

## Zustand Store Pattern

```typescript
// stores/debate-store.ts
import { create } from "zustand";
import type { Argument, Debate } from "@dialectical/shared";

interface DebateStore {
  debate: Debate | null;
  arguments: Map<string, Argument>; // flat map, keyed by ID
  setDebate: (d: Debate) => void;
  addArgument: (a: Argument) => void;
  getChildren: (parentId: string) => Argument[];
}

export const useDebateStore = create<DebateStore>((set, get) => ({
  debate: null,
  arguments: new Map(),
  setDebate: (debate) => set({ debate }),
  addArgument: (arg) => set(state => {
    const next = new Map(state.arguments);
    next.set(arg.id, arg);
    return { arguments: next };
  }),
  getChildren: (parentId) =>
    Array.from(get().arguments.values()).filter(a => a.parentId === parentId),
}));
```

## Styling
- Tailwind CSS v4 — use `@import "tailwindcss"` in globals.css (NOT the v3 `@tailwind` directives)
- Color system: green-500 (PRO), red-500 (CON), blue-500 (THESIS), gray (neutral)
- CSS custom properties for theme: `--color-pro`, `--color-con`, `--color-thesis`, etc.
- Dark mode: `@media (prefers-color-scheme: dark)` on CSS variables
- Animations: use `transition-all duration-200` for smooth interactions
- Responsive: mobile-first, breakpoints at sm/md/lg

## MultiversX Wallet Connection (sdk-dapp v5.0.8)

sdk-dapp v5 is framework-agnostic (React, Angular, Vue, Next.js) using Zustand internally.
Uses `initApp()` instead of the old `DappProvider` wrapper. Cross-tab communication replaces URL redirects.

```typescript
// lib/multiversx.ts — v5 initialization (NOT the old DappProvider pattern)
import { initApp, ProviderFactory } from "@multiversx/sdk-dapp";

// Initialize once at app startup (e.g., in layout.tsx or _app.tsx)
await initApp({
  environment: "devnet",
  // customNetworkConfig: { ... }
});

// Wallet connection uses ProviderFactory (unified API for all wallet types)
const provider = await ProviderFactory.create({
  type: "extension", // or "walletConnect", "webWallet", "ledger"
});
await provider.login();
```

UI components come from `@multiversx/sdk-dapp-ui` (web components, framework-agnostic).
State management uses Zustand internally — compatible with our app-level Zustand stores.

## Authentication UI
- Auth modal supports 3 methods: "Continue with Google", "Continue with Apple", "Email & Password"
- Email/password form: registration (email + password + confirm) and login (email + password)
- Wallet connection is a separate flow on `/profile/wallet` (link to existing account)
- All auth state managed by Auth.js sessions — NEVER localStorage

## tRPC Client Gotcha

Exporting `createTRPCReact<AppRouter>()` causes TS2742 portability error. ALWAYS add explicit type:

```typescript
import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@dialectical/backend";

// SAFETY: Explicit type annotation avoids TS2742 portability error
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();
```

The `httpBatchLink` also needs a cast: `httpBatchLink({ url }) as TRPCLink<AppRouter>`.

## Constraints
- No `localStorage` for auth — Auth.js sessions only
- All schemas from `@dialectical/shared`
- No default exports except page.tsx and layout.tsx files
- Components max ~150 lines — extract sub-components
- All client-side data fetching via tRPC hooks (no raw fetch)
- Hosting target: dezbatere.ro (Hetzner CX33 Nuremberg)
- Backend package MUST have `exports` field in package.json for `AppRouter` type import to work
