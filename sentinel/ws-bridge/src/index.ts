import { WebSocketServer } from "ws";
import { openSentinelDb } from "../../shared/src/db.js";
import { fileURLToPath } from "node:url";

export function startWsBridge(port = Number(process.env.NEXT_SENTINEL_WS_PORT ?? 8787)) {
  const db = openSentinelDb();
  const server = new WebSocketServer({ port, host: "127.0.0.1" });
  let lastId = 0;

  const poll = setInterval(() => {
    const rows = db.prepare(`
      SELECT id, timestamp, vertical, advisory_type, severity, title, message,
             recommended_actions_json, human_approval_required, evidence_json
      FROM advisories
      WHERE id > ?
      ORDER BY id ASC
    `).all(lastId) as Array<Record<string, unknown>>;

    for (const row of rows) {
      lastId = Number(row.id);
      const event = JSON.stringify({
        type: "sentinel.advisory",
        advisory: {
          id: row.id,
          timestamp: row.timestamp,
          vertical: row.vertical,
          advisoryType: row.advisory_type,
          severity: row.severity,
          title: row.title,
          message: row.message,
          recommendedActions: JSON.parse(String(row.recommended_actions_json)),
          humanApprovalRequired: Boolean(row.human_approval_required),
          evidence: JSON.parse(String(row.evidence_json))
        }
      });
      for (const client of server.clients) {
        if (client.readyState === client.OPEN) client.send(event);
      }
    }
  }, 1500);

  server.on("close", () => clearInterval(poll));
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = startWsBridge();
  console.log(JSON.stringify({ service: "ws-bridge", address: server.address() }));
}
