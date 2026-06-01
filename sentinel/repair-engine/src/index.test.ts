import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { preflightCheck } from "./index.js";

describe("repair-engine", () => {
  it("runs preflight checks against a local database", () => {
    const result = preflightCheck("data/test-preflight.db");
    assert.equal(result.ok, true);
  });
});

