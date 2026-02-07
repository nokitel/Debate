---
name: mvx-ai-tools
description: MultiversX AI agent commerce protocols (ACP, x402), development tools (MCP server, mx-agent-kit, xPilot), and Robert Sasu's adapter ecosystem
globs: ["packages/backend/src/agent/**", "packages/backend/src/routes/acp*", "packages/backend/src/routes/x402*"]
---

# MultiversX AI Agent Tools & Commerce Protocols

## Overview

Four protocols enable AI agents to transact on MultiversX:

| Protocol | Creator | Layer | MultiversX Status |
|----------|---------|-------|-------------------|
| **ACP** | OpenAI/Stripe | Checkout flow | ✅ Live — `sasurobert/multiversx-acp-adapter` (Feb 4, 2026) |
| **x402** | Coinbase/Cloudflare | Payment execution | ⚠️ Announced — needs custom MultiversX facilitator |
| **MCP** | Anthropic | AI tool context | ✅ Live — `@multiversx/mcp` on npm |
| **UCP** | Google | Full commerce lifecycle | ✅ First blockchain integration |

## Robert Sasu's Repositories (github.com/sasurobert)

Robert Sasu is a MultiversX core protocol developer since 2019. Key repos:

| Repo | Purpose |
|------|---------|
| `multiversx-acp-adapter` | ACP checkout → MultiversX tx translation with Relayed v3 gasless |
| `multiversx-mcp-server` | MCP server for Claude Desktop / Cursor (TypeScript) |
| `x402` | Fork of coinbase/x402 for MultiversX x402 integration |
| `multiversx-openclaw-relayer` | OpenClaw AI assistant → MultiversX bridge |
| `multiversx-improvement-documents` | Economics V2 proposal (tail inflation + burn) |

**No CLAUDE.md, SKILL.md, or AGENTS.md** in Sasu's repos. xPilot (below) is the only tool with those files.

## ACP — Agentic Commerce Protocol (Production-Ready)

The ACP adapter translates structured AI agent purchase intents into MultiversX transactions.
Gasless via Relayed v3 — agents transact without holding EGLD.

### 5 Required Checkout Endpoints

```
POST /api/acp/checkout_sessions          — Create session
POST /api/acp/checkout_sessions/:id      — Update session
POST /api/acp/checkout_sessions/:id/complete — Complete with payment
POST /api/acp/checkout_sessions/:id/cancel   — Cancel session
GET  /api/acp/checkout_sessions/:id      — Retrieve state
```

### Webhooks
- `order.created` and `order.updated` events
- HMAC authentication on webhook payloads

### Product Feed for Dialectical Engine

Register debate arguments as purchasable products:

```typescript
// Product catalog for ACP discovery
const products = [
  {
    id: "debate_argument_pro",
    name: "PRO Argument Generation",
    description: "AI-generated supporting argument for a debate thesis",
    price: { amount: 10, currency: "usd" }, // $0.10
    fulfillment: "digital", // Instant delivery
    parameters: {
      thesis: { type: "string", required: true },
      parentArgumentId: { type: "string", required: false },
      qualityTier: { type: "enum", values: ["standard", "premium"] },
    },
  },
  {
    id: "debate_argument_con",
    name: "CON Argument Generation",
    description: "AI-generated opposing argument for a debate thesis",
    price: { amount: 10, currency: "usd" },
    fulfillment: "digital",
    parameters: { /* same as above */ },
  },
];
```

### Agent-to-Agent Work Contracts

ACP supports work agreements between agents:
1. Agent A discovers Agent B's capabilities
2. Agent A constructs work agreement + locks funds in escrow
3. Agent B performs work, submits proof
4. Oracle validates deliverable
5. Escrow releases or refunds

This pattern fits the Dialectical Engine: external agents can request argument generation as a service.

## x402 — HTTP 402 Micropayments (Needs Custom Facilitator)

x402 revives HTTP 402 "Payment Required" for machine-to-machine payments.
**Production-ready on EVM (Base/Ethereum) and Solana.** MultiversX needs a custom facilitator.

### How x402 Works

```
1. Agent: GET /api/agent/generate?thesis=...
2. Server: 402 Payment Required
   Headers: X-Payment-Amount: 10 (cents), X-Payment-Token: USDC
3. Agent: GET /api/agent/generate?thesis=...
   Headers: X-Payment-Proof: <signed_tx>
4. Server: Verifies payment → executes pipeline → returns argument
```

### Custom MultiversX Facilitator (To Build)

The Coinbase x402 SDK ships facilitators for EVM (`@x402/evm`) and Solana (`@x402/svm`).
No `@x402/mvx` exists. Build one implementing:

```
POST /verify    — Verify payment proof is valid MultiversX ESDT transfer
POST /settle    — Execute the MultiversX transaction
GET  /supported — Return supported tokens (USDC-c76f1f on devnet)
```

Use CAIP-2 chain identifier for MultiversX. x402 V2 supports modular chain plugins.

### Next.js Integration (when facilitator exists)

```typescript
// middleware.ts
import { paymentMiddleware } from "x402-next";

export default paymentMiddleware(handler, {
  "/api/agent/generate": {
    price: "$0.10",
    network: "multiversx-devnet",
    config: { facilitatorUrl: process.env.X402_FACILITATOR_URL },
  },
});
```

## MCP Server — Claude Desktop / Cursor Integration

`@multiversx/mcp` on npm — 6 blockchain operation tools:

| Tool | Description |
|------|-------------|
| `createWallet` | Generate PEM wallet |
| `getNetwork` | Current network info |
| `getAddress` | Wallet address from PEM |
| `getBalance` | Account balance |
| `sendTransaction` | Send EGLD, fungible, SFT, NFT, MetaESDT |
| `issueToken` | Issue new token |

### Configuration

```json
// Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json
// Cursor: ~/.cursor/mcp.json
{
  "mcpServers": {
    "multiversx": {
      "command": "npx",
      "args": ["-y", "@multiversx/mcp"],
      "env": {
        "MVX_NETWORK": "devnet",
        "MVX_WALLET": "/path/to/wallet.pem"
      }
    }
  }
}
```

Run standalone: `npx -y @multiversx/mcp`

## mx-agent-kit — Eliza AI Framework + Portkey Gateway

Meta-repository combining two systems:

**Eliza MultiversX Plugin** — AI agent framework with blockchain capabilities:
- Send EGLD/ESDT tokens
- Create/manage tokens
- Swap tokens
- Multi-network support
- Automatic nonce management

**Portkey AI Gateway** — 250+ LLM providers with failover:
- Supports: Anthropic, OpenAI, Google, Mistral, Cohere, etc.
- Works with: Eliza, OpenAI Swarm, LlamaIndex, LangChain, CrewAI, AutoGen
- Load balancing, retry logic, model routing

### Setup
```bash
git clone https://github.com/multiversx/mx-agent-kit
cd mx-agent-kit && ./setup.sh
# Configure .env: PORTKEY_PROVIDER_API_KEY, PORTKEY_MODEL_PROVIDER, PORTKEY_MODEL
./start.sh
# Runs: Eliza server, Eliza client (localhost:5173), AI Gateway (localhost:8787)
```

Requires Node.js v23.3+ and PNPM v9+.

## xPilot — VS Code Extension (Only Tool with CLAUDE.md)

`unievo/xpilot` v2.2.0 (Dec 2025) — Cline/Astro fork specialized for MultiversX.

**Only tool in the ecosystem with CLAUDE.md, AGENTS.md, and `.claude/commands/`** for Claude Code.

Features: instructions library, MCP server support, built-in MultiversX knowledge.
Supports Claude, Gemini, GPT-4.1.

Companion tools:
- `xpilot-mcp-library` — 3 MCP servers: MultiversX API, mxpy CLI, sc-meta CLI
- `xpilot-instructions` — Instruction library
- `xpilot-workflows` — Workflow library

## LLM-Ready MultiversX Documentation

**Append `.md` to ANY docs.multiversx.com URL** for markdown version:

```
https://docs.multiversx.com/developers/overview
→ https://docs.multiversx.com/developers/overview.md

https://docs.multiversx.com/developers/developer-reference/storage-mappers
→ https://docs.multiversx.com/developers/developer-reference/storage-mappers.md
```

Key pages for the Dialectical Engine:
- `https://docs.multiversx.com/developers/relayed-transactions.md`
- `https://docs.multiversx.com/sdk-and-tools/sdk-js/sdk-js-cookbook.md`
- `https://docs.multiversx.com/developers/developer-reference/storage-mappers.md`
- `https://docs.multiversx.com/developers/gas-and-fees/overview.md`
- `https://docs.multiversx.com/developers/developer-reference/sc-annotations.md`
- `https://docs.multiversx.com/developers/account-storage.md`

## Integration Priority for Dialectical Engine

1. **ACP adapter** (HIGHEST — production-ready today): Register as ACP-compatible service, implement 5 checkout endpoints, enable ChatGPT/Claude/Gemini to discover and purchase arguments
2. **MCP server** (development): Use `@multiversx/mcp` for AI-assisted devnet testing
3. **x402 facilitator** (build custom): Create MultiversX-specific facilitator for HTTP 402 micropayments
4. **mx-agent-kit** (explore): Consider Eliza plugin for autonomous agent debate participation
