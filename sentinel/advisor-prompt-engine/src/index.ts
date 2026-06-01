import { openSentinelDb, insertAdvisory } from "../../shared/src/db.js";
import { deterministicAdvisory } from "./prompt.js";
import { fileURLToPath } from "node:url";

export function runAdvisorOnce() {
  const db = openSentinelDb();
  try {
    const row = db.prepare(`
      SELECT vertical, payload_json
      FROM kpi_snapshots
      ORDER BY id DESC
      LIMIT 1
    `).get() as { vertical: "k12" | "higher_ed" | "ngo"; payload_json: string } | undefined;

    if (!row) return null;
    const evidence = JSON.parse(row.payload_json);
    const type = evidence.expenses > evidence.revenue ? "cash_flow_alert" : "operations_watch";
    const advisory = deterministicAdvisory(type, row.vertical, evidence);
    insertAdvisory(db, advisory);
    return advisory;
  } finally {
    db.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(runAdvisorOnce()));
}
