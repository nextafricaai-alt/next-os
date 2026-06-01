/**
 * Audit logger.
 * -------------
 * Every action Nia takes is written here. Two implementations:
 *   - InMemory: for tests and the demo. Lives in RAM, evaporates on restart.
 *   - (later) Supabase: persistent, tenant-scoped, queryable by Hudson.
 *
 * The interface is intentionally tiny so we can swap implementations.
 */

import type { AuditEntry } from "./hand.js";

export interface AuditLogger {
  /** Append a new entry. Must be append-only — never edit or delete. */
  log: (entry: AuditEntry) => Promise<void>;
  /** Read recent entries, optionally filtered by tenant. */
  read: (opts?: { tenantId?: string; limit?: number }) => Promise<AuditEntry[]>;
}

/** Simple in-memory logger. Good for tests and the local demo. */
export function createInMemoryAuditLogger(): AuditLogger {
  const entries: AuditEntry[] = [];
  return {
    async log(entry: AuditEntry) {
      entries.push(entry);
    },
    async read(opts) {
      const limit = opts?.limit ?? 100;
      let result = entries;
      if (opts?.tenantId) {
        result = result.filter((e) => {
          const args = e.args as Record<string, unknown> | null;
          return args && (args.tenantId === opts.tenantId);
        });
      }
      return result.slice(-limit).reverse();
    },
  };
}
