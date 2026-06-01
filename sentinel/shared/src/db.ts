import { DatabaseSync } from "node:sqlite";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type { Advisory, HealthLog, UnifiedKpiSnapshot } from "./types.js";

export function openSentinelDb(dbPath = process.env.NEXT_SENTINEL_DB ?? "data/sentinel.db") {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  return db;
}

export function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS health_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      source TEXT NOT NULL,
      severity TEXT NOT NULL,
      state_hash TEXT NOT NULL,
      signature TEXT,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS log_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      from_log_id INTEGER NOT NULL,
      to_log_id INTEGER NOT NULL,
      batch_hash TEXT NOT NULL,
      signature TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kpi_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution_id TEXT NOT NULL,
      vertical TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      revenue REAL NOT NULL,
      expenses REAL NOT NULL,
      active_students INTEGER NOT NULL,
      capacity_threshold INTEGER NOT NULL,
      energy_cost REAL NOT NULL,
      inventory_risk_score REAL NOT NULL,
      resource_utilization REAL NOT NULL,
      donor_restricted_funds REAL,
      financial_aid_pending REAL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS advisories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      vertical TEXT NOT NULL,
      advisory_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      recommended_actions_json TEXT NOT NULL,
      human_approval_required INTEGER NOT NULL,
      evidence_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recovery_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL,
      resolution_timestamp TEXT,
      details_json TEXT NOT NULL
    );
  `);
}

export function insertHealthLog(db: DatabaseSync, log: HealthLog) {
  return db.prepare(`
    INSERT INTO health_logs (timestamp, source, severity, state_hash, signature, payload_json)
    VALUES (@timestamp, @source, @severity, @stateHash, @signature, @payload)
  `).run({ ...log, payload: JSON.stringify(log.payload), signature: log.signature ?? null });
}

export function insertKpiSnapshot(db: DatabaseSync, kpi: UnifiedKpiSnapshot) {
  return db.prepare(`
    INSERT INTO kpi_snapshots (
      institution_id, vertical, timestamp, revenue, expenses, active_students, capacity_threshold,
      energy_cost, inventory_risk_score, resource_utilization, donor_restricted_funds,
      financial_aid_pending, payload_json
    ) VALUES (
      @institutionId, @vertical, @timestamp, @revenue, @expenses, @activeStudents,
      @capacityThreshold, @energyCost, @inventoryRiskScore, @resourceUtilization,
      @donorRestrictedFunds, @financialAidPending, @payload
    )
  `).run({ ...kpi, payload: JSON.stringify(kpi) });
}

export function insertAdvisory(db: DatabaseSync, advisory: Advisory) {
  return db.prepare(`
    INSERT INTO advisories (
      timestamp, vertical, advisory_type, severity, title, message,
      recommended_actions_json, human_approval_required, evidence_json
    ) VALUES (
      @timestamp, @vertical, @advisoryType, @severity, @title, @message,
      @recommendedActions, @humanApprovalRequired, @evidence
    )
  `).run({
    ...advisory,
    recommendedActions: JSON.stringify(advisory.recommendedActions),
    humanApprovalRequired: advisory.humanApprovalRequired ? 1 : 0,
    evidence: JSON.stringify(advisory.evidence)
  });
}
