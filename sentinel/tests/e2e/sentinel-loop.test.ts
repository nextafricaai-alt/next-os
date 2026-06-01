import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ingestFromLocalFiles, evaluateThresholds } from "../../context-aggregator/src/index.js";

describe("NEXT Sentinel loop", () => {
  it("normalizes local data and emits governance-safe advisories", () => {
    const dir = mkdtempSync(join(tmpdir(), "next-sentinel-"));
    writeFileSync(join(dir, "finance.json"), JSON.stringify([
      { institutionId: "ngo-1", vertical: "ngo", finance: { donorIncome: 500, expenses: 800 } }
    ]));
    writeFileSync(join(dir, "operations.json"), JSON.stringify([
      { institutionId: "ngo-1", ops: { activeStudents: 40, capacityThreshold: 80, energyCost: 120, inventoryRiskScore: 0.7, resourceUtilization: 0.5 } }
    ]));
    const [snapshot] = ingestFromLocalFiles(dir);
    const advisories = evaluateThresholds(snapshot);
    assert.equal(snapshot.vertical, "ngo");
    assert.equal(advisories.length, 2);
    assert.equal(advisories.every(a => a.humanApprovalRequired), true);
  });
});

