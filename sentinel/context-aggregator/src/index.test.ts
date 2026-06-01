import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateThresholds, normalizeKpi } from "./index.js";

describe("context-aggregator", () => {
  it("generates cash flow and enrollment advisories", () => {
    const kpi = normalizeKpi({
      institutionId: "school-1",
      vertical: "k12",
      finance: { revenue: 100, expenses: 200 },
      ops: { activeStudents: 50, capacityThreshold: 100 }
    });
    const types = evaluateThresholds(kpi).map(a => a.advisoryType);
    assert.deepEqual(types, ["cash_flow_alert", "enrollment_alert"]);
  });
});

