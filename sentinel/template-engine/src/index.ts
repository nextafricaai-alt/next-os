import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { InstitutionVertical, OnboardingBundle, ReplicationProfile, SchoolProfile } from "../../shared/src/types.js";

const TEMPLATE_PATHS: Record<InstitutionVertical, string> = {
  k12: "templates/schools/school-template.json",
  higher_ed: "templates/organisations/organisation-template.json",
  ngo: "templates/ngos/ngo-template.json",
  church: "templates/churches/church-template.json",
  company: "templates/companies/company-template.json",
  organisation: "templates/organisations/organisation-template.json"
};

const DEFAULT_PROFILE_PATH = "templates/schools/sample-school-profile.json";

export function validateSchoolProfile(profile: SchoolProfile) {
  const missing: string[] = [];
  for (const field of ["institutionId", "name", "country", "currency", "academicYear", "capacityThreshold", "expectedEnrollment", "feeCategories"] as const) {
    if (profile[field] === undefined || profile[field] === null || profile[field] === "") missing.push(field);
  }
  if (!Array.isArray(profile.feeCategories) || profile.feeCategories.length === 0) missing.push("feeCategories[0]");
  if (profile.capacityThreshold <= 0) throw new Error("capacityThreshold must be greater than 0");
  if (profile.expectedEnrollment < 0) throw new Error("expectedEnrollment cannot be negative");
  if (missing.length) throw new Error(`School profile is missing: ${missing.join(", ")}`);
}

export function validateReplicationProfile(profile: ReplicationProfile) {
  const missing: string[] = [];
  for (const field of ["institutionId", "name", "templateType", "country", "currency", "operatingYear", "capacityThreshold", "activeParticipants", "revenueStreams"] as const) {
    if (profile[field] === undefined || profile[field] === null || profile[field] === "") missing.push(field);
  }
  if (!TEMPLATE_PATHS[profile.templateType]) missing.push("templateType");
  if (!Array.isArray(profile.revenueStreams) || profile.revenueStreams.length === 0) missing.push("revenueStreams[0]");
  if (profile.capacityThreshold <= 0) throw new Error("capacityThreshold must be greater than 0");
  if (profile.activeParticipants < 0) throw new Error("activeParticipants cannot be negative");
  if (missing.length) throw new Error(`Replication profile is missing: ${missing.join(", ")}`);
}

export function buildSchoolOnboardingBundle(profile: SchoolProfile): OnboardingBundle {
  validateSchoolProfile(profile);
  const replicationProfile: ReplicationProfile = {
    institutionId: profile.institutionId,
    name: profile.name,
    templateType: "k12",
    country: profile.country,
    district: profile.district,
    currency: profile.currency,
    operatingYear: profile.academicYear,
    capacityThreshold: profile.capacityThreshold,
    activeParticipants: profile.expectedEnrollment,
    openingCashBalance: profile.openingCashBalance,
    revenueStreams: profile.feeCategories.map(fee => ({ name: fee.name, amount: fee.amount, cadence: fee.cadence })),
    integrations: {
      financeSource: profile.integrations?.financeSource,
      peopleSource: profile.integrations?.enrollmentSource,
      inventorySource: profile.integrations?.inventorySource
    },
    governanceContacts: profile.governanceContacts,
    labels: {
      participantName: "learners",
      revenueName: "school fees",
      governanceBody: "school board"
    }
  };
  return buildOnboardingBundle(replicationProfile);
}

export function buildOnboardingBundle(profile: ReplicationProfile): OnboardingBundle {
  validateReplicationProfile(profile);
  const template = JSON.parse(readFileSync(TEMPLATE_PATHS[profile.templateType], "utf8")) as Record<string, unknown>;
  const revenueMultiplier = profile.templateType === "k12" ? profile.activeParticipants : 1;
  const revenue = totalStreamAmount(profile.revenueStreams, revenueMultiplier);
  const expenses = totalStreamAmount(profile.expenseStreams ?? [], 1);

  return {
    profile,
    financeIngest: {
      institutionId: profile.institutionId,
      vertical: profile.templateType,
      finance: {
        revenue,
        expenses,
        feePayments: profile.templateType === "k12" ? revenue : undefined,
        donorIncome: profile.templateType === "ngo" ? revenue : undefined,
        currency: profile.currency,
        openingCashBalance: profile.openingCashBalance ?? 0,
        revenueStreams: profile.revenueStreams,
        expenseStreams: profile.expenseStreams ?? []
      }
    },
    operationsIngest: {
      institutionId: profile.institutionId,
      ops: {
        activeStudents: profile.activeParticipants,
        capacityThreshold: profile.capacityThreshold,
        energyCost: getTemplateDefault(template, "energyCost", 0),
        inventoryRiskScore: getTemplateDefault(template, "inventoryRiskScore", 0.25),
        resourceUtilization: getTemplateDefault(template, "resourceUtilization", 0.5),
        participantName: profile.labels?.participantName ?? getTemplateLabel(template, "participantName", "participants")
      }
    },
    sentinelPolicy: {
      templateId: template.templateId,
      institutionId: profile.institutionId,
      vertical: profile.templateType,
      thresholds: template.thresholds,
      modules: template.modules,
      labels: profile.labels ?? template.labels,
      humanApprovalRequiredForFinancialActions: true,
      localOnly: true,
      approvedRepairActions: ["notify_only", "restart_container", "rollback_snapshot"]
    },
    advisorySeed: {
      institutionId: profile.institutionId,
      greetingContext: `${profile.name} in ${profile.district ? `${profile.district}, ` : ""}${profile.country}`,
      preferredQuestion: getTemplateQuestion(template),
      governanceContacts: profile.governanceContacts ?? []
    }
  };
}

export function writeSchoolOnboardingBundle(profilePath: string, outputRoot = "data/onboarding") {
  const profile = JSON.parse(readFileSync(profilePath, "utf8")) as SchoolProfile;
  const bundle = buildSchoolOnboardingBundle(profile);
  return writeBundle(profile.institutionId, bundle, outputRoot);
}

export function writeOnboardingBundle(profilePath: string, outputRoot = "data/onboarding") {
  const raw = JSON.parse(readFileSync(profilePath, "utf8")) as SchoolProfile | ReplicationProfile;
  const bundle = "templateType" in raw ? buildOnboardingBundle(raw) : buildSchoolOnboardingBundle(raw);
  return writeBundle(raw.institutionId, bundle, outputRoot);
}

function writeBundle(institutionId: string, bundle: OnboardingBundle, outputRoot: string) {
  const targetDir = join(outputRoot, institutionId);
  mkdirSync(targetDir, { recursive: true });
  writeJson(join(targetDir, "profile.json"), bundle.profile);
  writeJson(join(targetDir, "finance.json"), [bundle.financeIngest]);
  writeJson(join(targetDir, "operations.json"), [bundle.operationsIngest]);
  writeJson(join(targetDir, "sentinel-policy.json"), bundle.sentinelPolicy);
  writeJson(join(targetDir, "advisory-seed.json"), bundle.advisorySeed);
  return { targetDir, bundle };
}

function totalStreamAmount(streams: Array<{ amount: number }>, multiplier: number) {
  return streams.reduce((sum, stream) => sum + stream.amount, 0) * multiplier;
}

function getTemplateDefault(template: Record<string, unknown>, key: string, fallback: number) {
  const defaults = template.kpiDefaults as Record<string, unknown> | undefined;
  const value = defaults?.[key];
  return typeof value === "number" ? value : fallback;
}

function getTemplateLabel(template: Record<string, unknown>, key: string, fallback: string) {
  const labels = template.labels as Record<string, unknown> | undefined;
  const value = labels?.[key];
  return typeof value === "string" ? value : fallback;
}

function getTemplateQuestion(template: Record<string, unknown>) {
  const tone = template.advisoryTone as Record<string, unknown> | undefined;
  return typeof tone?.example === "string" ? tone.example : "Would you like me to prepare a leadership-ready report?";
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const profilePath = process.argv[2] ?? DEFAULT_PROFILE_PATH;
  const outputRoot = process.argv[3] ?? "data/onboarding";
  const result = writeOnboardingBundle(profilePath, outputRoot);
  console.log(JSON.stringify({ service: "template-engine", targetDir: result.targetDir }));
}
