/**
 * HealthSignal — the canonical shape every child OS pushes up to NEXT OS.
 *
 * One agent supervises many ships. To do that, every ship must speak the same
 * language. This is that language.
 *
 * The core fields are vertical-agnostic (every tenant has these). The `kpis`
 * block is vertical-specific (a school's KPIs differ from a hospital's).
 *
 * Adapters live in sentinel/adapters/<vertical>-os.ts. Each adapter takes the
 * raw, messy data from a specific tenant's database and transforms it into
 * this shape.
 */

/** Which kind of ship this is. Drives which adapter normalizes the data. */
export type Vertical =
  | "school"
  | "hospital"
  | "home"
  | "ngo"
  | "company"
  | "church"
  | "organisation";

/** Sentinel reads from where? In-tenant DB connection details. */
export interface TenantDataSource {
  /** What kind of database the tenant runs. Determines which driver to use. */
  kind: "postgres" | "mysql" | "sqlite" | "rest-api" | "supabase";
  /** Connection string or REST endpoint. Stored encrypted in the tenants table. */
  connection: string;
  /** Optional per-source notes (e.g. "uses school SIS schema v2"). */
  notes?: string;
}

/** Vertical-specific KPI blocks. Add new verticals here as we build them. */
export interface SchoolKpis {
  revenueThisTerm: number;
  expensesThisTerm: number;
  activeStudents: number;
  capacityThreshold: number;
  feesOutstandingTotal: number;
  feesOutstandingFamilyCount: number;
  energyCostMonthly?: number;
  inventoryRiskScore?: number;
}

export interface HospitalKpis {
  intakeThisWeek: number;
  occupancyRate: number;
  revenueThisMonth: number;
  expensesThisMonth: number;
  averageWaitMinutes?: number;
}

export interface HomeKpis {
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsBalance: number;
  upcomingBillsTotal?: number;
}

export interface NgoKpis {
  donorsActive: number;
  donationsThisMonth: number;
  programSpendThisMonth: number;
  runwayMonths: number;
}

export interface CompanyKpis {
  revenueThisMonth: number;
  expensesThisMonth: number;
  burnRate: number;
  arrAnnualized?: number;
  teamSize: number;
}

export type Kpis =
  | { vertical: "school"; data: SchoolKpis }
  | { vertical: "hospital"; data: HospitalKpis }
  | { vertical: "home"; data: HomeKpis }
  | { vertical: "ngo"; data: NgoKpis }
  | { vertical: "company"; data: CompanyKpis };

/**
 * The signal itself. Every child OS produces these on a schedule (or on
 * demand) and pushes them to Supabase. Sentinel reasons over them.
 */
export interface HealthSignal {
  /** UUID for this specific signal. Set server-side on insert. */
  id?: string;
  /** Which tenant this belongs to. References tenants.id. */
  tenantId: string;
  /** ISO-8601 timestamp when the signal was captured. */
  timestamp: string;
  /** Vertical and its KPI payload. */
  kpis: Kpis;
  /** Hash of the payload + tenant secret. Verifies the signal wasn't tampered. */
  signature: string;
  /** Free-form notes the adapter wants to attach (e.g. "term ended"). */
  notes?: string;
}

/**
 * An advisory flows in the opposite direction: Sentinel → tenant leader.
 * The shape matches what the existing ws-bridge already emits to the frontend,
 * so the UI doesn't change when we swap the WebSocket for Supabase Realtime.
 */
export interface Advisory {
  id: string;
  tenantId: string;
  timestamp: string;
  vertical: Vertical;
  advisoryType:
    | "financial-leak"
    | "enrollment-drop"
    | "capacity-warning"
    | "energy-cost-spike"
    | "inventory-risk"
    | "donor-drought"
    | "burn-rate-warning";
  severity: "info" | "warn" | "critical";
  title: string;
  message: string;
  recommendedActions: Array<{
    label: string;
    /** What the leader is being asked to approve. Sentinel never acts without
     *  approval on anything in this list. */
    requiresApproval: true;
    /** Machine-readable identifier the repair-engine knows how to execute. */
    actionId: string;
  }>;
  evidence: Record<string, unknown>;
  /** Always true in the first wow moment. Graduates to false as trust builds. */
  humanApprovalRequired: boolean;
}
