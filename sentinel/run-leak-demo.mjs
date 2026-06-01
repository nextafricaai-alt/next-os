#!/usr/bin/env node
/**
 * NEXT Sentinel — financial-leak wow moment, one-shot demo.
 *
 * Usage:  node run-leak-demo.mjs
 *
 * What it does:
 *   1. Runs the context-aggregator against the st-marys-financial-leak scenario.
 *      The aggregator detects expenses > revenue and inserts a cash_flow_alert.
 *   2. Reads the freshest advisory back out of sentinel.db.
 *   3. Renders it as the WhatsApp message the school leader would receive.
 *   4. If TWILIO_* env vars are set, actually sends it via WhatsApp.
 *      Otherwise just prints it for inspection.
 *
 * Run `npm run build` first if you've edited any TypeScript.
 */

import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { renderAdvisory } from "./dist/whatsapp-bridge/src/render.js";
import { sendWhatsApp, loadTwilioConfigFromEnv } from "./dist/whatsapp-bridge/src/twilio.js";

const SCENARIO = "data/onboarding/st-marys-financial-leak";
const TENANT_NAME = process.env.TWILIO_TENANT_NAME ?? "St. Mary's Demo School";
const CURRENCY = process.env.TWILIO_TENANT_CURRENCY ?? "UGX";

console.log("==========================================================");
console.log("NEXT Sentinel — financial-leak demo");
console.log("==========================================================\n");

console.log("Step 1: running aggregator on", SCENARIO);
const agg = spawnSync("node", ["dist/context-aggregator/src/index.js", SCENARIO], {
  stdio: "inherit",
});
if (agg.status !== 0) {
  console.error("Aggregator failed — did you run `npm run build` first?");
  process.exit(agg.status ?? 1);
}

console.log("\nStep 2: reading latest advisory from sentinel.db");
const db = new DatabaseSync("data/sentinel.db");
const row = db.prepare(
  "SELECT * FROM advisories WHERE evidence_json LIKE '%st-marys%' " +
    "AND advisory_type='cash_flow_alert' ORDER BY id DESC LIMIT 1"
).get();
db.close();
if (!row) {
  console.error("No advisory found. Did the aggregator fire one?");
  process.exit(1);
}

const advisory = {
  vertical: row.vertical,
  advisoryType: row.advisory_type,
  severity: row.severity,
  title: row.title,
  message: row.message,
  recommendedActions: JSON.parse(row.recommended_actions_json),
  evidence: JSON.parse(row.evidence_json),
};

const body = renderAdvisory(advisory, { tenantName: TENANT_NAME, currency: CURRENCY });
console.log("\nStep 3: rendered message preview\n");
console.log("----------------------------------------------------------");
console.log(body);
console.log("----------------------------------------------------------\n");

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_WHATSAPP_TO) {
  console.log("Step 4: sending via Twilio to", process.env.TWILIO_WHATSAPP_TO);
  const twilio = loadTwilioConfigFromEnv();
  const result = await sendWhatsApp(twilio, process.env.TWILIO_WHATSAPP_TO, body);
  if (result.success) {
    console.log("✅ Sent. Twilio SID:", result.twilioSid);
  } else {
    console.error("❌ Twilio error:", result.errorCode, result.errorMessage);
    process.exit(1);
  }
} else {
  console.log("Step 4: skipped (no TWILIO_ACCOUNT_SID + TWILIO_WHATSAPP_TO in env).");
  console.log("        To actually send: see whatsapp-bridge/README.md and re-run.");
}
