import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { openSentinelDb } from "../../shared/src/db.js";
import type { RecoveryAction } from "../../shared/src/types.js";

const APPROVED_CONTAINERS = new Set((process.env.NEXT_SENTINEL_APPROVED_CONTAINERS ?? "next-os,next-ws-bridge,next-context-aggregator").split(","));

export function preflightCheck(dbPath = process.env.NEXT_SENTINEL_DB ?? "data/sentinel.db") {
  const db = openSentinelDb(dbPath);
  try {
    const row = db.prepare("PRAGMA integrity_check").get() as Record<string, string>;
    const integrity = Object.values(row)[0];
    if (integrity !== "ok") throw new Error(`SQLite integrity check failed: ${integrity}`);
    return {
      ok: true,
      dbHash: hashFileIfExists(dbPath),
      checkedAt: new Date().toISOString()
    };
  } finally {
    db.close();
  }
}

export function autoRollback(dbPath = process.env.NEXT_SENTINEL_DB ?? "data/sentinel.db", snapshotDir = "data/snapshots") {
  const snapshot = join(snapshotDir, "last-clean.db");
  if (!existsSync(snapshot)) throw new Error(`No clean snapshot available at ${snapshot}`);
  mkdirSync(dirname(dbPath), { recursive: true });
  copyFileSync(snapshot, dbPath);
  recordRecovery({ action: "rollback_snapshot", target: dbPath, reason: "Restored last known clean database snapshot", requestedBy: "sentinel" }, "resolved");
}

export function executeRecovery(action: RecoveryAction) {
  preflightCheck();
  if (action.action === "notify_only") {
    recordRecovery(action, "notified");
    return { status: "notified" };
  }
  if (action.action === "rollback_snapshot") {
    autoRollback(action.target);
    return { status: "resolved" };
  }
  if (action.action === "restart_container") {
    if (!APPROVED_CONTAINERS.has(action.target)) throw new Error(`Container ${action.target} is not approved for Sentinel restart`);
    const result = spawnSync("docker", ["restart", action.target], { encoding: "utf8", timeout: 30000 });
    if (result.status !== 0) throw new Error(result.stderr || `docker restart failed with status ${result.status}`);
    recordRecovery(action, "resolved", { stdout: result.stdout.trim() });
    return { status: "resolved" };
  }
  throw new Error(`Unsupported recovery action ${action.action}`);
}

function recordRecovery(action: RecoveryAction, status: string, details: Record<string, unknown> = {}) {
  const db = openSentinelDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO recovery_events (timestamp, action, target, status, reason, resolution_timestamp, details_json)
    VALUES (@timestamp, @action, @target, @status, @reason, @resolutionTimestamp, @details)
  `).run({
    timestamp: now,
    action: action.action,
    target: action.target,
    status,
    reason: action.reason,
    resolutionTimestamp: status === "resolved" ? now : null,
    details: JSON.stringify(details)
  });
}

function hashFileIfExists(path: string) {
  if (!existsSync(path)) return null;
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [, , raw] = process.argv;
  if (!raw) throw new Error("Pass a JSON RecoveryAction");
  console.log(JSON.stringify(executeRecovery(JSON.parse(raw))));
}
