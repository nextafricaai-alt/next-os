import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { openSentinelDb, insertKpiSnapshot, insertAdvisory } from "../../shared/src/db.js";
import type { Advisory, InstitutionVertical, UnifiedKpiSnapshot } from "../../shared/src/types.js";

type RawFinance = { revenue?: number; expenses?: number; feePayments?: number; donorIncome?: number };
type RawOps = { activeStudents?: number; capacityThreshold?: number; energyCost?: number; inventoryRiskScore?: number; resourceUtilization?: number };

export function normalizeKpi(input: {
  institutionId: string;
  vertical: InstitutionVertical;
  finance: RawFinance;
  ops: RawOps;
}): UnifiedKpiSnapshot {
  return {
    institutionId: input.institutionId,
    vertical: input.vertical,
    timestamp: new Date().toISOString(),
    revenue: Number(input.finance.revenue ?? input.finance.feePayments ?? input.finance.donorIncome ?? 0),
    expenses: Number(input.finance.expenses ?? 0),
    activeStudents: Number(input.ops.activeStudents ?? 0),
    capacityThreshold: Number(input.ops.capacityThreshold ?? 1),
    energyCost: Number(input.ops.energyCost ?? 0),
    inventoryRiskScore: Number(input.ops.inventoryRiskScore ?? 0),
    resourceUtilization: Number(input.ops.resourceUtilization ?? 0)
  };
}

export function evaluateThresholds(kpi: UnifiedKpiSnapshot): Advisory[] {
  const advisories: Advisory[] = [];
  if (kpi.expenses > kpi.revenue) {
    advisories.push(makeAdvisory(kpi, "cash_flow_alert", "WARN", "Cash flow needs board attention",
      `Current expenses are above revenue for this reporting window. Would you like me to prepare a short cash-flow report showing pending income, essential commitments, and options for the board to review?`,
      ["Review pending fees, grants, or donor disbursements", "Prioritize essential operating expenses", "Ask finance to verify unusual transactions"]));
  }
  if (kpi.activeStudents < kpi.capacityThreshold) {
    advisories.push(makeAdvisory(kpi, "enrollment_alert", "WARN", "Enrollment is below the capacity threshold",
      verticalEnrollmentMessage(kpi.vertical),
      ["Review admissions pipeline", "Prepare outreach summary", "Compare resource allocation with current enrollment"]));
  }
  return advisories;
}

function verticalEnrollmentMessage(vertical: InstitutionVertical) {
  if (vertical === "church") {
    return "Active participation is below the ministry planning threshold. Would you like me to prepare a pastoral care, giving, and service attendance note for leadership review?";
  }
  if (vertical === "ngo") {
    return "Program participation is below the expected service capacity. Would you like me to prepare a beneficiary reach and budget-impact note for leadership review?";
  }
  if (vertical === "company") {
    return "Active utilization is below the operating threshold. Would you like me to prepare a revenue, staffing, and resource-use summary for management review?";
  }
  if (vertical === "organisation") {
    return "Participation is below the expected operating threshold. Would you like me to prepare a concise membership, service delivery, and resource-use note for the leadership team?";
  }
  if (vertical === "higher_ed") {
    return "Active student numbers are below the planning threshold. Would you like me to generate an admissions, financial aid, and facility utilization summary?";
  }
  return "Active learners are below the expected capacity. Would you like me to generate a report on pending school fees, admissions follow-up, and classroom resource use?";
}

function makeAdvisory(
  kpi: UnifiedKpiSnapshot,
  advisoryType: string,
  severity: Advisory["severity"],
  title: string,
  message: string,
  recommendedActions: string[]
): Advisory {
  return {
    timestamp: new Date().toISOString(),
    vertical: kpi.vertical,
    advisoryType,
    severity,
    title,
    message,
    recommendedActions,
    humanApprovalRequired: true,
    evidence: { ...kpi }
  };
}

export function ingestFromLocalFiles(baseDir = process.env.NEXT_SENTINEL_INGEST_DIR ?? "data/ingest") {
  const financePath = join(baseDir, "finance.json");
  const opsPath = join(baseDir, "operations.json");
  if (!existsSync(financePath) || !existsSync(opsPath)) return [];
  const financeRows = JSON.parse(readFileSync(financePath, "utf8")) as Array<{ institutionId: string; vertical: InstitutionVertical; finance: RawFinance }>;
  const opsRows = JSON.parse(readFileSync(opsPath, "utf8")) as Array<{ institutionId: string; ops: RawOps }>;
  return financeRows.map(row => {
    const ops = opsRows.find(candidate => candidate.institutionId === row.institutionId)?.ops ?? {};
    return normalizeKpi({ ...row, ops });
  });
}

export function runOnce(baseDir?: string) {
  const db = openSentinelDb();
  try {
    const snapshots = ingestFromLocalFiles(baseDir);
    for (const snapshot of snapshots) {
      insertKpiSnapshot(db, snapshot);
      for (const advisory of evaluateThresholds(snapshot)) insertAdvisory(db, advisory);
    }
    return snapshots.length;
  } finally {
    db.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const ingestDir = process.argv[2] ?? process.env.NEXT_SENTINEL_INGEST_DIR;
  const count = runOnce(ingestDir);
  console.log(JSON.stringify({ service: "context-aggregator", ingestDir: ingestDir ?? "data/ingest", ingested: count }));
}
