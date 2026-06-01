/**
 * WhatsApp Bridge service.
 * Polls sentinel.db advisories. Local single-tenant mode for now:
 * TWILIO_WHATSAPP_TO + TWILIO_TENANT_NAME env vars define one recipient.
 * Supabase multi-tenant mode comes later (Edge Function on Realtime).
 */

import { openSentinelDb } from "../../shared/src/db.js";
import { fileURLToPath } from "node:url";
import { renderAdvisory, type RenderableAdvisory } from "./render.js";
import { sendWhatsApp, loadTwilioConfigFromEnv, type TwilioConfig } from "./twilio.js";

interface AdvisoryRow {
  id: number;
  timestamp: string;
  vertical: string;
  advisory_type: string;
  severity: string;
  title: string;
  message: string;
  recommended_actions_json: string;
  human_approval_required: number;
  evidence_json: string;
}

function rowToRenderable(row: AdvisoryRow): RenderableAdvisory {
  return {
    vertical: row.vertical,
    advisoryType: row.advisory_type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    recommendedActions: JSON.parse(row.recommended_actions_json ?? "[]"),
    humanApprovalRequired: Boolean(row.human_approval_required),
    evidence: JSON.parse(row.evidence_json ?? "{}"),
    timestamp: row.timestamp,
  };
}

interface LocalConfig {
  to: string;
  tenantName: string;
  currency: string;
}

function loadLocalConfig(): LocalConfig | null {
  const to = process.env.TWILIO_WHATSAPP_TO;
  if (!to) return null;
  return {
    to,
    tenantName: process.env.TWILIO_TENANT_NAME ?? "Your institution",
    currency: process.env.TWILIO_TENANT_CURRENCY ?? "UGX",
  };
}

export function startWhatsAppBridge(cfg?: TwilioConfig) {
  const twilio = cfg ?? loadTwilioConfigFromEnv();
  const local = loadLocalConfig();
  if (!local) {
    throw new Error(
      "WhatsApp bridge in local mode requires TWILIO_WHATSAPP_TO (and ideally TWILIO_TENANT_NAME)."
    );
  }
  const db = openSentinelDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_deliveries (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      advisory_id     INTEGER NOT NULL,
      to_number       TEXT NOT NULL,
      attempted_at    TEXT NOT NULL,
      success         INTEGER NOT NULL,
      twilio_sid      TEXT,
      error_message   TEXT
    );
  `);

  const seen = db
    .prepare(`SELECT COALESCE(MAX(advisory_id), 0) AS last_id FROM whatsapp_deliveries`)
    .get() as { last_id: number } | undefined;
  let lastSeenId = seen?.last_id ?? 0;

  const poll = setInterval(async () => {
    const rows = db
      .prepare(
        `SELECT id, timestamp, vertical, advisory_type, severity, title, message,
                recommended_actions_json, human_approval_required, evidence_json
         FROM advisories
         WHERE id > ?
         ORDER BY id ASC`
      )
      .all(lastSeenId) as AdvisoryRow[];

    for (const row of rows) {
      lastSeenId = Math.max(lastSeenId, row.id);
      const renderable = rowToRenderable(row);
      const body = renderAdvisory(renderable, {
        tenantName: local.tenantName,
        currency: local.currency,
      });
      const result = await sendWhatsApp(twilio, local.to, body);

      db.prepare(
        `INSERT INTO whatsapp_deliveries
         (advisory_id, to_number, attempted_at, success, twilio_sid, error_message)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        row.id,
        local.to,
        new Date().toISOString(),
        result.success ? 1 : 0,
        result.twilioSid ?? null,
        result.errorMessage ?? null
      );

      console.log(JSON.stringify({
        service: "whatsapp-bridge",
        advisoryId: row.id,
        to: local.to,
        success: result.success,
        twilioSid: result.twilioSid,
        error: result.errorMessage,
      }));
    }
  }, 1500);

  return { stop: () => clearInterval(poll) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startWhatsAppBridge();
  console.log(JSON.stringify({ service: "whatsapp-bridge", status: "running", mode: "local" }));
}
