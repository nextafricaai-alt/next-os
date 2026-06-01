/**
 * The Watch Hand — Hand #4
 * ------------------------
 * Watches the HealthSignal stream for one tenant (or the whole fleet) and
 * detects anomalies. This hand is autonomous — it can run on a schedule
 * without anyone asking it to.
 *
 * The Watch Hand finds problems. The Advise Hand turns those problems into
 * human-readable advice. Keeping them separate means we can change how we
 * detect anomalies (rule-based today, ML tomorrow) without rewriting the
 * advisory generator.
 */

import type { Hand, HandContext, HandResult } from "../hand.js";
import type { HealthSignal } from "../../shared/src/health-signal.js";

export interface WatchArgs {
  /** Which tenant(s) to watch. Omit to watch the whole fleet. */
  tenantId?: string;
  /** How far back to look. Default: last 24 hours. */
  sinceMinutes?: number;
}

export interface Anomaly {
  tenantId: string;
  kind: string;
  severity: "info" | "warn" | "critical";
  evidence: Record<string, unknown>;
  detectedAt: string;
}

export interface WatchResult {
  scanned: number;
  anomalies: Anomaly[];
}

export interface WatchAdapters {
  /** Pull recent HealthSignals from Supabase. */
  fetchSignals: (tenantId: string | undefined, sinceMinutes: number) => Promise<HealthSignal[]>;
}

/* -------------------------------------------------------------------------
 * Rule library. Each rule is a pure function over a HealthSignal. Adding a
 * new rule is one entry in this array — no other code changes.
 * ----------------------------------------------------------------------- */

type Rule = (signal: HealthSignal) => Anomaly | null;

const RULES: Rule[] = [
  // School: expenses exceed revenue this term → financial leak.
  (s) => {
    if (s.kpis.vertical !== "school") return null;
    const k = s.kpis.data;
    if (k.expensesThisTerm > k.revenueThisTerm) {
      return {
        tenantId: s.tenantId,
        kind: "financial-leak",
        severity: "critical",
        evidence: { gap: k.expensesThisTerm - k.revenueThisTerm, term: "current" },
        detectedAt: new Date().toISOString(),
      };
    }
    return null;
  },
  // School: capacity warning when enrollment under threshold.
  (s) => {
    if (s.kpis.vertical !== "school") return null;
    const k = s.kpis.data;
    if (k.activeStudents < k.capacityThreshold) {
      return {
        tenantId: s.tenantId,
        kind: "enrollment-drop",
        severity: "warn",
        evidence: { activeStudents: k.activeStudents, capacityThreshold: k.capacityThreshold },
        detectedAt: new Date().toISOString(),
      };
    }
    return null;
  },
  // Hospital: occupancy spike.
  (s) => {
    if (s.kpis.vertical !== "hospital") return null;
    const k = s.kpis.data;
    if (k.occupancyRate > 0.9) {
      return {
        tenantId: s.tenantId,
        kind: "capacity-warning",
        severity: "warn",
        evidence: { occupancyRate: k.occupancyRate },
        detectedAt: new Date().toISOString(),
      };
    }
    return null;
  },
  // NGO: runway under 3 months.
  (s) => {
    if (s.kpis.vertical !== "ngo") return null;
    const k = s.kpis.data;
    if (k.runwayMonths < 3) {
      return {
        tenantId: s.tenantId,
        kind: "donor-drought",
        severity: "critical",
        evidence: { runwayMonths: k.runwayMonths },
        detectedAt: new Date().toISOString(),
      };
    }
    return null;
  },
  // Company: burn-rate warning.
  (s) => {
    if (s.kpis.vertical !== "company") return null;
    const k = s.kpis.data;
    if (k.burnRate > k.revenueThisMonth) {
      return {
        tenantId: s.tenantId,
        kind: "burn-rate-warning",
        severity: "critical",
        evidence: { burnRate: k.burnRate, revenue: k.revenueThisMonth },
        detectedAt: new Date().toISOString(),
      };
    }
    return null;
  },
];

export function createWatchHand(adapters: WatchAdapters): Hand<WatchArgs, WatchResult> {
  return {
    name: "watch",
    description:
      "Scan recent HealthSignals for anomalies. Returns a list of problems detected. " +
      "Pair with the Advise Hand to convert anomalies into human-readable advisories.",
    permissionTier: "autonomous",
    inputSchema: {
      tenantId: "Optional. Restrict to one tenant. Omit to scan the whole fleet.",
      sinceMinutes: "Optional. How far back to scan. Default: 1440 (24 hours).",
    },

    async execute(args: WatchArgs, ctx: HandContext): Promise<HandResult<WatchResult>> {
      const sinceMinutes = args.sinceMinutes ?? 1440;
      try {
        const signals = await adapters.fetchSignals(args.tenantId, sinceMinutes);
        const anomalies: Anomaly[] = [];
        for (const s of signals) {
          for (const rule of RULES) {
            const hit = rule(s);
            if (hit) anomalies.push(hit);
          }
        }
        const message = `Scanned ${signals.length} signals; found ${anomalies.length} ${anomalies.length === 1 ? "anomaly" : "anomalies"}.`;
        await ctx.audit({
          hand: "watch",
          args,
          result: "ok",
          by: ctx.user.userId,
          notes: message,
        });
        return { ok: true, data: { scanned: signals.length, anomalies }, message };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.audit({ hand: "watch", args, result: "error", by: ctx.user.userId, notes: msg });
        return { ok: false, error: msg };
      }
    },
  };
}
