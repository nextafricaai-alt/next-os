export type Severity = "INFO" | "WARN" | "ERROR" | "CRITICAL";

export type InstitutionVertical = "k12" | "higher_ed" | "ngo" | "church" | "company" | "organisation";

export interface HealthLog {
  id?: number;
  timestamp: string;
  source: string;
  severity: Severity;
  stateHash: string;
  signature?: string;
  payload: Record<string, unknown>;
}

export interface Advisory {
  id?: number;
  timestamp: string;
  vertical: InstitutionVertical;
  advisoryType: string;
  severity: Severity;
  title: string;
  message: string;
  recommendedActions: string[];
  humanApprovalRequired: boolean;
  evidence: Record<string, unknown>;
}

export interface UnifiedKpiSnapshot {
  institutionId: string;
  vertical: InstitutionVertical;
  timestamp: string;
  revenue: number;
  expenses: number;
  activeStudents: number;
  capacityThreshold: number;
  energyCost: number;
  inventoryRiskScore: number;
  resourceUtilization: number;
  donorRestrictedFunds?: number;
  financialAidPending?: number;
}

export interface SchoolProfile {
  institutionId: string;
  name: string;
  country: string;
  district?: string;
  currency: string;
  academicYear: string;
  capacityThreshold: number;
  expectedEnrollment: number;
  openingCashBalance?: number;
  feeCategories: Array<{
    name: string;
    amount: number;
    cadence: "term" | "month" | "year";
  }>;
  integrations?: {
    financeSource?: string;
    enrollmentSource?: string;
    inventorySource?: string;
  };
  governanceContacts?: Array<{
    role: "board" | "administrator" | "finance" | "operations";
    name: string;
  }>;
}

export interface ReplicationProfile {
  institutionId: string;
  name: string;
  templateType: InstitutionVertical;
  country: string;
  district?: string;
  currency: string;
  operatingYear: string;
  capacityThreshold: number;
  activeParticipants: number;
  openingCashBalance?: number;
  revenueStreams: Array<{
    name: string;
    amount: number;
    cadence: "week" | "month" | "quarter" | "term" | "year" | "project";
  }>;
  expenseStreams?: Array<{
    name: string;
    amount: number;
    cadence: "week" | "month" | "quarter" | "term" | "year" | "project";
  }>;
  integrations?: {
    financeSource?: string;
    peopleSource?: string;
    inventorySource?: string;
    operationsSource?: string;
  };
  governanceContacts?: Array<{
    role: "board" | "administrator" | "finance" | "operations" | "pastor" | "director" | "manager";
    name: string;
  }>;
  labels?: {
    participantName?: string;
    revenueName?: string;
    governanceBody?: string;
  };
}

export interface OnboardingBundle {
  profile: SchoolProfile | ReplicationProfile;
  financeIngest: Record<string, unknown>;
  operationsIngest: Record<string, unknown>;
  sentinelPolicy: Record<string, unknown>;
  advisorySeed: Record<string, unknown>;
}

export interface RecoveryAction {
  action: "restart_container" | "rollback_snapshot" | "notify_only";
  target: string;
  reason: string;
  requestedBy: "sentinel";
}
