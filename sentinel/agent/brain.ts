/**
 * Agent Brain — the stable contract.
 * ----------------------------------
 * The brain is the agent's reasoning loop. It receives a snapshot of the
 * world (conversation so far, tenant context, user context, what hands are
 * available) and decides what to do next.
 *
 * CEO framing: think of this file as the constitution. The hands (tools) are
 * the laws — they can be added, removed, or amended every week. The brain
 * is the constitution — it changes rarely, and when it does, every part of
 * the system inherits the new mind immediately.
 *
 * This file defines TYPES ONLY. The runtime implementation lives in
 * brain-runtime.ts so the contract stays import-light and easy to test.
 */

/**
 * Permission tiers govern what a hand may do without explicit human approval.
 * - "autonomous": the brain may call it without asking (read-only stuff, watching).
 * - "needs-approval": the brain proposes; a human must say YES via WhatsApp/web.
 * - "admin-only": only Hudson or sanctioned operators can trigger (e.g. spawning new tenants).
 */
export type PermissionTier = "autonomous" | "needs-approval" | "admin-only";

/** A single turn in the agent's conversation. */
export interface AgentMessage {
  role: "user" | "agent" | "hand" | "system";
  content: string;
  /** When role === "hand", which hand produced this output. */
  handName?: string;
  timestamp: string;
}

/** What we know about the tenant the agent is currently serving.
 *  Null when no tenant exists yet (e.g. someone is spawning a brand-new school). */
export interface TenantContext {
  tenantId: string;
  vertical: string;
  name: string;
  language: string;
  currency: string;
  /** Open-ended bag the brain can read but should treat as read-only here. */
  meta?: Record<string, unknown>;
}

/** What we know about the human currently talking to the agent. */
export interface UserContext {
  userId: string;
  /** Role within the tenant. "admin" can trigger admin-only hands. */
  role: "admin" | "owner" | "operator" | "member" | "guest";
  language: string;
  /** Which interface they're using right now. */
  channel: "whatsapp" | "web" | "voice" | "sms";
}

/** A self-describing summary of a hand so the brain knows it exists. */
export interface HandDescriptor {
  name: string;
  description: string;
  permissionTier: PermissionTier;
  /** Plain-language description of each argument the hand accepts. */
  inputSchema: Record<string, string>;
}

/** Everything the brain needs to make one decision. */
export interface BrainInput {
  conversation: AgentMessage[];
  tenant: TenantContext | null;
  user: UserContext;
  availableHands: HandDescriptor[];
}

/** What the brain emits after one reasoning pass. */
export type BrainDecision =
  | {
      kind: "call-hand";
      hand: string;
      args: unknown;
      rationale: string;
    }
  | {
      kind: "respond";
      message: string;
    }
  | {
      kind: "wait-for-approval";
      hand: string;
      args: unknown;
      /** A human-readable preview shown to the approver before they say YES. */
      preview: string;
    };

export interface BrainOutput {
  /** Short chain-of-thought the brain used. Useful for the audit log. */
  reasoning: string;
  decision: BrainDecision;
}

/**
 * The brain implementation is anything that satisfies this signature.
 * In production this wraps a Claude/GPT call; in tests it can be a stub.
 * Keeping it as a function signature (not a class) means we never lock
 * ourselves into a particular LLM vendor.
 */
export type BrainReasoner = (input: BrainInput) => Promise<BrainOutput>;
