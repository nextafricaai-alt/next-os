/**
 * Schools OS adapter
 * ------------------
 * One job: take whatever shape Hudson's Schools OS prototype emits, normalize
 * it into a HealthSignal, and ship it to Supabase. When the prototype lands,
 * we update ONLY this file. Nothing else in Sentinel needs to know.
 *
 * The placeholder mappings below assume the school's database has a `finance`
 * and `enrollment` table similar to what's already in
 * sentinel/data/onboarding/st-marys-demo/. When Hudson brings the real
 * prototype, we replace these mappings with whatever the prototype actually
 * exposes — could be a REST endpoint, a Postgres view, a Supabase RPC, etc.
 */

import { createHmac } from "node:crypto";
import type {
  HealthSignal,
  SchoolKpis,
  TenantDataSource,
} from "../shared/src/health-signal.js";

/** Whatever the Schools prototype emits. Loose for now — tighten when we know. */
export interface RawSchoolsOsPayload {
  termRevenue: number;
  termExpenses: number;
  activeStudents: number;
  capacityThreshold: number;
  outstandingFees: {
    total: number;
    familyCount: number;
  };
  energyCostMonthly?: number;
  inventoryRiskScore?: number;
}

/**
 * Transform the raw Schools OS payload into a signed HealthSignal ready for
 * Supabase insertion. Called by the ingest endpoint that fronts each tenant.
 */
export function transformSchoolsOsPayload(
  raw: RawSchoolsOsPayload,
  ctx: { tenantId: string; tenantSecret: string; capturedAt?: string }
): HealthSignal {
  const data: SchoolKpis = {
    revenueThisTerm: raw.termRevenue,
    expensesThisTerm: raw.termExpenses,
    activeStudents: raw.activeStudents,
    capacityThreshold: raw.capacityThreshold,
    feesOutstandingTotal: raw.outstandingFees.total,
    feesOutstandingFamilyCount: raw.outstandingFees.familyCount,
    energyCostMonthly: raw.energyCostMonthly,
    inventoryRiskScore: raw.inventoryRiskScore,
  };

  const timestamp = ctx.capturedAt ?? new Date().toISOString();
  const payload = { tenantId: ctx.tenantId, timestamp, kpis: { vertical: "school" as const, data } };
  const signature = createHmac("sha256", ctx.tenantSecret)
    .update(JSON.stringify(payload))
    .digest("hex");

  return { ...payload, signature };
}

/**
 * When the prototype is ready, this is the function the agent calls to pull
 * data from the school's own database. The connection string lives in
 * tenants.data_source (encrypted). For now this is a stub that throws —
 * Hudson's prototype will tell us what the real fetch looks like.
 */
export async function fetchFromSchoolDatabase(
  source: TenantDataSource
): Promise<RawSchoolsOsPayload> {
  // TODO(hudson-prototype): replace with the actual fetch your Schools OS
  // exposes. Likely shapes:
  //   - REST: GET /api/sentinel/health-snapshot
  //   - Supabase RPC: rpc('sentinel_snapshot')
  //   - SQL: SELECT ... FROM finance_view JOIN enrollment_view ...
  throw new Error(
    `Schools adapter stub: connect path not yet implemented for source kind '${source.kind}'. ` +
    `When the Schools prototype is ready, wire it here.`
  );
}
