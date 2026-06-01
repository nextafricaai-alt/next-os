# NEXT Sentinel Architecture

## Trust Boundaries

Sentinel is embedded inside NEXT OS and communicates only over local filesystem, SQLite, and loopback WebSocket. The daemon writes canonical observations. Higher-level services read those observations and write advisories or recovery events.

## Triple Loop

1. Observability: Rust service samples host health and SQLite integrity. Each row has a severity, state hash, and local signature.
2. Reasoning: prompt engine converts raw logs and KPI state into board-ready advisories. A bundled local model may be used through loopback; deterministic fallback is always available.
3. Action: repair engine executes only approved actions after `preflightCheck()`. Financial and governance decisions are advisory only.

## Data Governance

All financial recommendations use `humanApprovalRequired: true`. No external network calls are required or allowed for normal operation. Docker and systemd manifests enforce least privilege with no new privileges and narrow writable paths.

