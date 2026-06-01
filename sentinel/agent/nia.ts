/**
 * Nia — the "use this" entry point.
 * --------------------------------
 * One function. Pass your API key + adapters. Get back a ready agent.
 *
 * Example:
 *   import { createNia } from "./nia.js";
 *   import { createStubAdapters } from "./stub-adapters.js";
 *
 *   const nia = createNia({
 *     apiKey: process.env.ANTHROPIC_API_KEY!,
 *     adapters: createStubAdapters(),
 *   });
 *
 *   const out = await nia.runTurn({
 *     userMessage: "Show me anomalies from the last 24 hours.",
 *     conversation: [],
 *     tenant: { tenantId: "demo", vertical: "school", name: "Demo", language: "en", currency: "UGX" },
 *     user: { userId: "u1", role: "admin", language: "en", channel: "web" },
 *   });
 *   console.log(out.finalMessage);
 *
 * Swap stubAdapters for real Supabase/Twilio/M-Pesa adapters in production.
 * Everything else stays the same.
 */

import { createAnthropicBrain, type BrainRuntimeConfig } from "./brain-runtime.js";
import { createAgentLoop, type AgentLoopConfig } from "./agent-loop.js";
import { createAllHands, type AllAdapters, type HandRegistry } from "./hands/index.js";
import { createInMemoryAuditLogger, type AuditLogger } from "./audit.js";

export interface NiaConfig {
  /** Anthropic API key. */
  apiKey: string;
  /** All 12 hand adapter sets. Use createStubAdapters for the demo. */
  adapters: AllAdapters;
  /** Optional: override defaults from BrainRuntimeConfig. */
  brain?: Omit<BrainRuntimeConfig, "apiKey">;
  /** Optional: bring your own audit logger. Defaults to in-memory. */
  auditLogger?: AuditLogger;
  /** Optional: max brain-call cycles per turn. Default 5. */
  maxStepsPerTurn?: number;
}

export interface Nia {
  runTurn: ReturnType<typeof createAgentLoop>;
  hands: HandRegistry;
  audit: AuditLogger;
}

export function createNia(config: NiaConfig): Nia {
  const brain = createAnthropicBrain({
    apiKey: config.apiKey,
    ...config.brain,
  });
  const hands = createAllHands(config.adapters);
  const audit = config.auditLogger ?? createInMemoryAuditLogger();

  const loop = createAgentLoop({
    brain,
    hands,
    auditLogger: audit,
    maxStepsPerTurn: config.maxStepsPerTurn,
  });

  return { runTurn: loop, hands, audit };
}
