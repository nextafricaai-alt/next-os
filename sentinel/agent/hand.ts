/**
 * Hand — the universal interface every ability of the agent implements.
 * ---------------------------------------------------------------------
 * In Hudson's metaphor, the agent has many hands. Each one does ONE thing
 * well. The Spawn Hand spawns. The Pay Hand pays. The Watch Hand watches.
 *
 * Every hand MUST conform to this interface. That contract is what lets us
 * plug new hands in (or replace old ones) without touching the brain.
 *
 * Think of it like USB. The brain has a USB port. Hands have a USB plug.
 * Any hand can be hot-swapped, and the brain doesn't know the difference.
 */

import type {
  PermissionTier,
  TenantContext,
  UserContext,
} from "./brain.js";

/** What every hand receives at execution time. */
export interface HandContext {
  /** The tenant being acted upon. Null for spawn (no tenant exists yet). */
  tenant: TenantContext | null;
  /** The human who triggered the call (directly or via the brain). */
  user: UserContext;
  /** Append-only audit logger. Every hand MUST write here. */
  audit: (entry: Omit<AuditEntry, "timestamp">) => Promise<void>;
}

/** Standard shape every hand returns. */
export interface HandResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  /** Short human-readable summary the brain can hand back to the user. */
  message?: string;
}

/** One row of the immutable audit log. */
export interface AuditEntry {
  hand: string;
  args: unknown;
  result: "ok" | "error" | "approved" | "denied" | "queued";
  /** UserId who triggered or approved the call (when applicable). */
  by?: string;
  /** When the action happened. ISO-8601. */
  timestamp: string;
  /** Free-form notes — usually the message field from HandResult. */
  notes?: string;
}

/**
 * The universal hand. Every file in hands/ exports a value of this type.
 * Brain code only ever sees this interface — never the concrete classes —
 * which is what makes the "don't touch the agent" property hold.
 */
export interface Hand<TArgs = unknown, TResult = unknown> {
  /** Unique identifier the brain uses to call this hand. */
  readonly name: string;
  /** One-sentence description shown to the brain so it knows what this hand does. */
  readonly description: string;
  /** Permission tier. The brain refuses to call admin-only hands without an admin user. */
  readonly permissionTier: PermissionTier;
  /** Plain-language description of each argument. The brain uses this to fill args. */
  readonly inputSchema: Record<string, string>;
  /**
   * Do the thing. Hands MUST be side-effecting only after they have what they need.
   * If args are missing, return ok:false with an error explaining what's missing.
   */
  execute(args: TArgs, ctx: HandContext): Promise<HandResult<TResult>>;
}

/**
 * Helper: turn a Hand into a HandDescriptor for the brain.
 * Keeps the brain's view of available hands purely descriptive.
 */
export function describe(hand: Hand): {
  name: string;
  description: string;
  permissionTier: PermissionTier;
  inputSchema: Record<string, string>;
} {
  return {
    name: hand.name,
    description: hand.description,
    permissionTier: hand.permissionTier,
    inputSchema: hand.inputSchema,
  };
}
