import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildOnboardingBundle, buildSchoolOnboardingBundle } from "./index.js";
import type { ReplicationProfile, SchoolProfile } from "../../shared/src/types.js";

describe("school template engine", () => {
  it("turns a school profile into replicated Sentinel ingest and policy files", () => {
    const profile: SchoolProfile = {
      institutionId: "green-hill",
      name: "Green Hill School",
      country: "Uganda",
      currency: "UGX",
      academicYear: "2026",
      capacityThreshold: 400,
      expectedEnrollment: 450,
      feeCategories: [{ name: "Tuition", amount: 1000, cadence: "term" }]
    };

    const bundle = buildSchoolOnboardingBundle(profile);
    assert.equal(bundle.financeIngest.vertical, "k12");
    assert.equal((bundle.operationsIngest.ops as { activeStudents: number }).activeStudents, 450);
    assert.equal(bundle.sentinelPolicy.humanApprovalRequiredForFinancialActions, true);
  });

  it("supports churches, NGOs, companies, and organisations from the same replication engine", () => {
    const base = {
      institutionId: "demo",
      name: "Demo",
      country: "Uganda",
      currency: "UGX",
      operatingYear: "2026",
      capacityThreshold: 100,
      activeParticipants: 80,
      revenueStreams: [{ name: "Income", amount: 1000, cadence: "month" as const }],
      expenseStreams: [{ name: "Costs", amount: 1200, cadence: "month" as const }]
    };

    for (const templateType of ["church", "ngo", "company", "organisation"] as const) {
      const profile: ReplicationProfile = { ...base, institutionId: `demo-${templateType}`, templateType };
      const bundle = buildOnboardingBundle(profile);
      assert.equal(bundle.financeIngest.vertical, templateType);
      assert.equal((bundle.financeIngest.finance as { revenue: number }).revenue, 1000);
      assert.equal(bundle.sentinelPolicy.localOnly, true);
    }
  });
});
