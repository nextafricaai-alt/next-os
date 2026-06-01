use anyhow::{Context, Result};
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{env, path::PathBuf, thread, time::Duration};
use sysinfo::{Disks, System};
use tracing::{error, info};

#[derive(Debug, Clone, Serialize)]
enum Severity {
    INFO,
    WARN,
    ERROR,
    CRITICAL,
}

#[derive(Debug, Serialize)]
struct HealthPayload {
    cpu_usage_percent: f32,
    memory_used_bytes: u64,
    memory_total_bytes: u64,
    storage_available_bytes: u64,
    storage_total_bytes: u64,
    sqlite_integrity: String,
}

#[derive(Debug, Serialize)]
struct HealthLog {
    timestamp: String,
    source: String,
    severity: Severity,
    state_hash: String,
    payload: HealthPayload,
}

fn main() -> Result<()> {
    tracing_subscriber::fmt().json().init();
    let db_path = env::var("NEXT_SENTINEL_DB").unwrap_or_else(|_| "data/sentinel.db".to_string());
    let interval = env::var("NEXT_SENTINEL_INTERVAL_MS")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(5000);

    let conn = open_db(PathBuf::from(db_path))?;
    migrate(&conn)?;
    info!("NEXT Sentinel daemon started");

    loop {
        match observe_and_write(&conn) {
            Ok(log_id) => info!(log_id, "health observation persisted"),
            Err(err) => error!(error = %err, "health observation failed"),
        }
        thread::sleep(Duration::from_millis(interval));
    }
}

fn open_db(path: PathBuf) -> Result<Connection> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).with_context(|| format!("creating {}", parent.display()))?;
    }
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
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
        "#,
    )?;
    Ok(())
}

fn observe_and_write(conn: &Connection) -> Result<i64> {
    let payload = collect_payload(conn)?;
    let severity = classify(&payload);
    let state_hash = state_hash(&payload)?;
    let log = HealthLog {
        timestamp: Utc::now().to_rfc3339(),
        source: "sentinel-daemon".to_string(),
        severity,
        state_hash,
        payload,
    };
    insert_health_log(conn, &log)
}

fn collect_payload(conn: &Connection) -> Result<HealthPayload> {
    let mut sys = System::new_all();
    sys.refresh_all();
    let disks = Disks::new_with_refreshed_list();
    let total = disks.iter().map(|d| d.total_space()).sum();
    let available = disks.iter().map(|d| d.available_space()).sum();
    Ok(HealthPayload {
        cpu_usage_percent: sys.global_cpu_usage(),
        memory_used_bytes: sys.used_memory(),
        memory_total_bytes: sys.total_memory(),
        storage_available_bytes: available,
        storage_total_bytes: total,
        sqlite_integrity: sqlite_integrity(conn)?,
    })
}

fn sqlite_integrity(conn: &Connection) -> Result<String> {
    let result: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;
    Ok(result)
}

fn classify(payload: &HealthPayload) -> Severity {
    let memory_ratio = payload.memory_used_bytes as f64 / payload.memory_total_bytes.max(1) as f64;
    let storage_ratio =
        1.0 - (payload.storage_available_bytes as f64 / payload.storage_total_bytes.max(1) as f64);
    if payload.sqlite_integrity != "ok" {
        Severity::CRITICAL
    } else if payload.cpu_usage_percent > 95.0 || memory_ratio > 0.95 || storage_ratio > 0.95 {
        Severity::CRITICAL
    } else if payload.cpu_usage_percent > 85.0 || memory_ratio > 0.85 || storage_ratio > 0.85 {
        Severity::WARN
    } else {
        Severity::INFO
    }
}

fn state_hash(payload: &HealthPayload) -> Result<String> {
    let encoded = serde_json::to_vec(payload)?;
    let mut hasher = Sha256::new();
    hasher.update(encoded);
    Ok(hex::encode(hasher.finalize()))
}

fn insert_health_log(conn: &Connection, log: &HealthLog) -> Result<i64> {
    let payload_json = serde_json::to_string(&log.payload)?;
    let signature = sign_batch(&log.state_hash, &payload_json);
    conn.execute(
        "INSERT INTO health_logs (timestamp, source, severity, state_hash, signature, payload_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            log.timestamp,
            log.source,
            format!("{:?}", log.severity),
            log.state_hash,
            signature,
            payload_json
        ],
    )?;
    let id = conn.last_insert_rowid();
    create_signed_batch_if_due(conn, id)?;
    Ok(id)
}

fn sign_batch(state_hash: &str, payload_json: &str) -> String {
    let mut hasher = Sha256::new();
    let secret = env::var("NEXT_SENTINEL_LOG_KEY").unwrap_or_else(|_| "next-local-audit-key".into());
    hasher.update(secret.as_bytes());
    hasher.update(state_hash.as_bytes());
    hasher.update(payload_json.as_bytes());
    hex::encode(hasher.finalize())
}

fn create_signed_batch_if_due(conn: &Connection, latest_id: i64) -> Result<()> {
    if latest_id % 10 != 0 {
        return Ok(());
    }
    let from_id = latest_id - 9;
    let mut stmt = conn.prepare(
        "SELECT CAST(id AS TEXT), timestamp, source, severity, state_hash, COALESCE(signature, ''), payload_json
         FROM health_logs
         WHERE id BETWEEN ?1 AND ?2
         ORDER BY id ASC",
    )?;
    let mut rows = stmt.query(params![from_id, latest_id])?;
    let mut hasher = Sha256::new();
    while let Some(row) = rows.next()? {
        for idx in 0..7 {
            let value: String = row.get(idx)?;
            hasher.update(value.as_bytes());
        }
    }
    let batch_hash = hex::encode(hasher.finalize());
    let signature = sign_batch(&batch_hash, "log-batch");
    conn.execute(
        "INSERT INTO log_batches (created_at, from_log_id, to_log_id, batch_hash, signature)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![Utc::now().to_rfc3339(), from_id, latest_id, batch_hash, signature],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_corrupt_database_as_critical() {
        let payload = HealthPayload {
            cpu_usage_percent: 10.0,
            memory_used_bytes: 10,
            memory_total_bytes: 100,
            storage_available_bytes: 90,
            storage_total_bytes: 100,
            sqlite_integrity: "database disk image is malformed".into(),
        };
        assert!(matches!(classify(&payload), Severity::CRITICAL));
    }

    #[test]
    fn hashes_are_stable_for_same_payload() {
        let payload = HealthPayload {
            cpu_usage_percent: 10.0,
            memory_used_bytes: 10,
            memory_total_bytes: 100,
            storage_available_bytes: 90,
            storage_total_bytes: 100,
            sqlite_integrity: "ok".into(),
        };
        assert_eq!(state_hash(&payload).unwrap(), state_hash(&payload).unwrap());
    }
}
