/**
 * The Memory Hand — Hand #2
 * -------------------------
 * Long-term, per-tenant memory. Without this, the agent answers like a
 * stranger every conversation. With it, the agent remembers the last
 * decision, the school's history, the bursar's name, what was promised
 * to whom and when.
 *
 * Two kinds of memory live here:
 *   - episodic: discrete events ("on 2026-03-14 the bursar approved a
 *               UGX 300k cash advance for repairs").
 *   - semantic: stable facts ("this school uses three terms per year",
 *               "the chairman prefers WhatsApp voice notes").
 *
 * The adapter pattern keeps the storage layer swappable — start with
 * Supabase, swap for Postgres + pgvector later for proper embeddings.
 */

import type { Hand, HandContext, HandResult } from "../hand.js";

export type MemoryKind = "episodic" | "semantic";

export interface MemoryRecord {
  id: string;
  tenantId: string;
  kind: MemoryKind;
  content: string;
  /** Tags help retrieval without needing vectors: ["finance", "approval", "bursar"]. */
  tags: string[];
  /** ISO-8601. For episodic, when the event happened. For semantic, when it was learned. */
  timestamp: string;
  /** Optional structured payload that goes with the prose. */
  data?: Record<string, unknown>;
}

export type MemoryArgs =
  | { op: "remember"; kind: MemoryKind; content: string; tags?: string[]; data?: Record<string, unknown> }
  | { op: "recall"; query: string; tags?: string[]; limit?: number }
  | { op: "forget"; id: string };

export interface MemoryResult {
  op: MemoryArgs["op"];
  records?: MemoryRecord[];
  written?: MemoryRecord;
  forgotten?: boolean;
}

export interface MemoryAdapters {
  insert: (record: Omit<MemoryRecord, "id">) => Promise<MemoryRecord>;
  search: (tenantId: string, query: string, tags?: string[], limit?: number) => Promise<MemoryRecord[]>;
  remove: (id: string, tenantId: string) => Promise<boolean>;
}

export function createMemoryHand(adapters: MemoryAdapters): Hand<MemoryArgs, MemoryResult> {
  return {
    name: "memory",
    description:
      "Persistent per-tenant memory. Use 'remember' to save a fact or event. " +
      "Use 'recall' to retrieve relevant memories before answering. " +
      "Use 'forget' to remove a stale memory.",
    permissionTier: "autonomous",
    inputSchema: {
      op: "One of 'remember', 'recall', or 'forget'.",
      kind: "(for remember) 'episodic' for events, 'semantic' for stable facts.",
      content: "(for remember) The text of the memory.",
      tags: "(for remember/recall) Topic tags to aid retrieval.",
      data: "(for remember) Optional structured payload.",
      query: "(for recall) Natural-language query.",
      limit: "(for recall) Max records to return. Default 10.",
      id: "(for forget) The memory record id to remove.",
    },

    async execute(args: MemoryArgs, ctx: HandContext): Promise<HandResult<MemoryResult>> {
      if (!ctx.tenant) {
        return { ok: false, error: "memory hand requires a tenant context" };
      }
      const tenantId = ctx.tenant.tenantId;

      try {
        if (args.op === "remember") {
          const written = await adapters.insert({
            tenantId,
            kind: args.kind,
            content: args.content,
            tags: args.tags ?? [],
            timestamp: new Date().toISOString(),
            data: args.data,
          });
          await ctx.audit({
            hand: "memory",
            args,
            result: "ok",
            by: ctx.user.userId,
            notes: `Remembered ${args.kind}: ${args.content.slice(0, 80)}`,
          });
          return { ok: true, data: { op: "remember", written }, message: "Saved." };
        }

        if (args.op === "recall") {
          const records = await adapters.search(tenantId, args.query, args.tags, args.limit ?? 10);
          await ctx.audit({
            hand: "memory",
            args,
            result: "ok",
            by: ctx.user.userId,
            notes: `Recalled ${records.length} memories for query: ${args.query.slice(0, 60)}`,
          });
          return {
            ok: true,
            data: { op: "recall", records },
            message: `Found ${records.length} relevant ${records.length === 1 ? "memory" : "memories"}.`,
          };
        }

        // forget
        const forgotten = await adapters.remove(args.id, tenantId);
        await ctx.audit({
          hand: "memory",
          args,
          result: forgotten ? "ok" : "error",
          by: ctx.user.userId,
          notes: forgotten ? `Forgot memory ${args.id}` : `Failed to forget ${args.id}`,
        });
        return {
          ok: forgotten,
          data: { op: "forget", forgotten },
          message: forgotten ? "Forgotten." : "Could not find that memory.",
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.audit({ hand: "memory", args, result: "error", by: ctx.user.userId, notes: msg });
        return { ok: false, error: msg };
      }
    },
  };
}
