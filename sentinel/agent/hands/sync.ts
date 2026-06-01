/**
 * The Sync Hand — Hand #9
 * -----------------------
 * Africa runs on intermittent power and unreliable internet. Every screen
 * in NEXT must work offline; edits queue locally and sync when the network
 * returns. This hand owns that protocol.
 *
 * Conflict model: last-write-wins per field, with full audit retention.
 * For collaborative-editing surfaces (rare in NEXT) we can upgrade to a
 * CRDT later without changing this interface.
 */

import type { Hand, HandContext, HandResult } from "../hand.js";

export interface SyncOp {
  /** Logical table / collection in the tenant DB. */
  table: string;
  /** Row primary key. */
  rowId: string;
  /** Field-level patch. */
  patch: Record<string, unknown>;
  /** Local timestamp the edit happened (ISO-8601). */
  occurredAt: string;
  /** Local op id (uuid) so duplicates are idempotent. */
  opId: string;
  /** Which user made the edit. */
  userId: string;
}

export type SyncArgs =
  | { op: "push"; ops: SyncOp[] }
  | { op: "pull"; sinceIso: string; tables?: string[] }
  | { op: "status" };

export interface SyncResult {
  op: SyncArgs["op"];
  accepted?: number;
  conflicts?: SyncConflict[];
  pulled?: SyncOp[];
  queueDepth?: number;
}

export interface SyncConflict {
  opId: string;
  reason: "stale" | "row-missing" | "permission-denied";
  serverVersion?: Record<string, unknown>;
}

export interface SyncAdapters {
  /** Apply ops to the canonical store; return acceptances and conflicts. */
  applyOps: (
    tenantId: string,
    ops: SyncOp[]
  ) => Promise<{ accepted: string[]; conflicts: SyncConflict[] }>;
  /** Fetch ops since a timestamp to push down to the device. */
  fetchOps: (tenantId: string, sinceIso: string, tables?: string[]) => Promise<SyncOp[]>;
  /** Depth of the per-tenant outbound queue (server side). */
  queueDepth: (tenantId: string) => Promise<number>;
}

export function createSyncHand(adapters: SyncAdapters): Hand<SyncArgs, SyncResult> {
  return {
    name: "sync",
    description:
      "Two-way sync of offline edits. 'push' uploads queued local ops; " +
      "'pull' fetches server-side changes since a timestamp; 'status' reports queue depth.",
    permissionTier: "autonomous",
    inputSchema: {
      op: "One of 'push', 'pull', or 'status'.",
      ops: "(push) Array of SyncOp objects to apply.",
      sinceIso: "(pull) ISO-8601 timestamp to fetch changes since.",
      tables: "(pull) Optional list of tables to filter.",
    },

    async execute(args: SyncArgs, ctx: HandContext): Promise<HandResult<SyncResult>> {
      if (!ctx.tenant) return { ok: false, error: "sync hand requires a tenant context" };
      const tenantId = ctx.tenant.tenantId;
      try {
        if (args.op === "push") {
          const { accepted, conflicts } = await adapters.applyOps(tenantId, args.ops);
          await ctx.audit({
            hand: "sync",
            args,
            result: conflicts.length === 0 ? "ok" : "error",
            by: ctx.user.userId,
            notes: `Push: accepted ${accepted.length}, conflicts ${conflicts.length}`,
          });
          return {
            ok: true,
            data: { op: "push", accepted: accepted.length, conflicts },
            message: `${accepted.length} ops accepted, ${conflicts.length} conflicts.`,
          };
        }
        if (args.op === "pull") {
          const pulled = await adapters.fetchOps(tenantId, args.sinceIso, args.tables);
          await ctx.audit({
            hand: "sync",
            args,
            result: "ok",
            by: ctx.user.userId,
            notes: `Pull: ${pulled.length} ops since ${args.sinceIso}`,
          });
          return { ok: true, data: { op: "pull", pulled }, message: `${pulled.length} new ops.` };
        }
        // status
        const queueDepth = await adapters.queueDepth(tenantId);
        return { ok: true, data: { op: "status", queueDepth }, message: `Queue: ${queueDepth} ops.` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.audit({ hand: "sync", args, result: "error", by: ctx.user.userId, notes: msg });
        return { ok: false, error: msg };
      }
    },
  };
}
