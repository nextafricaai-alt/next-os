# NEXT Agent — Nia

This directory is the brain and hands of NEXT OS.

> Nia (Swahili: *purpose*) is the agent at the heart of NEXT OS. She reasons, advises, and acts (with permission) across every NEXT tenant.

## What's Here

```
agent/
├── brain.ts              ← stable contract: BrainInput, BrainOutput, types
├── brain-runtime.ts      ← Claude-backed implementation of the brain
├── system-prompt.ts      ← Nia's personality and behaviour rules
├── agent-loop.ts         ← orchestrator: user msg → brain → hand → response
├── audit.ts              ← audit logger interface + in-memory impl
├── nia.ts                ← composition factory — the "use this" entry point
├── stub-adapters.ts      ← in-memory fakes so the runtime works without real services
├── configurator.ts       ← (existing) template → tenant config
├── examples/
│   └── talk-to-nia.ts    ← runnable demo
└── hands/                ← 12 hands (Spawn, Memory, Configure, Watch, Advise,
                            WhatsApp, Voice, Pay, Sync, Translate, Storyteller, Teacher)
```

## How It Fits Together

```
   user message
        │
        ▼
   ┌──────────────┐    BrainInput      ┌─────────────┐
   │ agent-loop   │ ─────────────────▶ │   brain     │ (Claude API)
   │              │ ◀───────────────── │             │
   └──────┬───────┘    BrainOutput     └─────────────┘
          │
          │ dispatch via HandRegistry
          ▼
   ┌──────────────┐
   │   hand       │  (one of 12; writes to audit log)
   └──────┬───────┘
          │
          ▼
   adapter (Supabase / Twilio / M-Pesa / ...)
```

Loop runs until Nia decides to respond, hits a needs-approval gate, or exhausts the step budget.

## Running the Demo

```bash
# from sentinel/agent
export ANTHROPIC_API_KEY=sk-ant-your-key
npx tsx examples/talk-to-nia.ts
```

You'll see Nia run a 3-message conversation against stub adapters, including which hands she called, and the audit log at the end.

## Going to Production — Wiring Real Adapters

`stub-adapters.ts` exports `createStubAdapters()`. To swap any single hand to a real adapter, pass it as an override:

```ts
import { createNia } from "./nia.js";
import { createStubAdapters } from "./stub-adapters.js";
import { createTwilioWhatsappAdapter } from "./adapters/twilio-whatsapp.js"; // you write this

const nia = createNia({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  adapters: createStubAdapters({
    whatsapp: createTwilioWhatsappAdapter({
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      fromNumber: process.env.TWILIO_FROM!,
    }),
  }),
});
```

That's it. Brain, hands, agent loop — all unchanged. Just the one adapter swapped.

## Permission Tiers

Every hand declares a tier. The brain enforces them at decision time, the runtime double-checks at execution:

- **autonomous** — Nia may call without asking. Read-only, drafting, parsing, translating.
- **needs-approval** — Nia proposes; the user must reply YES. Money movements, configuration changes.
- **admin-only** — Only `admin` / `owner` roles. Spawning new tenants, irreversible operations.

See each hand's source for its tier.

## Adding a 13th Hand

1. Create `hands/<name>.ts`. Export a `create<Name>Hand(adapters)` factory returning a `Hand`.
2. Add the adapter type to `AllAdapters` in `hands/index.ts` and call your factory in `createAllHands`.
3. Add a stub in `stub-adapters.ts` so the demo still runs.

No other file changes. The brain discovers the new hand automatically via `describeAll`.

## Editing Nia's Personality

Open `system-prompt.ts`. Edit the prose. Restart. Nia behaves differently from her next conversation onward. No code changes.

## What's NOT Here Yet

- Real adapters (Layer 3) — Supabase, Twilio, M-Pesa, Whisper.
- Entry points (Layer 4) — Twilio webhook, dashboard chat widget, admin CLI.
- Operations (Layer 5) — cron jobs for Watch, audit-log viewer, kill switches.

See the deployment plan in chat for the full 6-layer roadmap.
