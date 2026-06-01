# NEXT Sentinel

NEXT Sentinel is the embedded supervisory agent for NEXT Digital OS. It runs local-first, writes every observation and action to a local SQLite audit database, and keeps all reasoning, repair, and board advisory delivery inside the client deployment.

## Runtime Loops

- `sentinel-daemon`: Rust observability service for CPU, memory, storage, database integrity, cryptographic state hashes, and signed log batches.
- `context-aggregator`: KPI mapping service that normalizes K-12, higher education, and NGO/nonprofit data into a unified local schema.
- `advisor-prompt-engine`: Local LLM prompt layer with institution-aware few-shot examples and a deterministic fallback advisory renderer.
- `repair-engine`: Least-privilege recovery executor for approved actions only.
- `ws-bridge`: Local WebSocket bridge for pushing advisories into the NEXT OS frontend.

## Offline Contract

Sentinel makes no external network calls. Ollama or llama.cpp endpoints are expected to be bundled inside the NEXT OS package and bound to loopback only. If a local model is unavailable, the prompt engine returns governance-safe deterministic advisories.

## Quick Start

```powershell
cd .\sentinel
npm install
npm test
cargo test --manifest-path .\sentinel-daemon\Cargo.toml
```

For packaged deployments, use `deploy/docker/docker-compose.yml` or the native service files in `deploy/systemd` and `deploy/windows`.

## Replication Templates

Deployments can be replicated from small profile files for schools, churches, NGOs, companies, and organisations. Add a new profile, then run:

```powershell
npm.cmd run onboard -- templates/schools/sample-school-profile.json
npm.cmd run onboard -- templates/churches/sample-church-profile.json
npm.cmd run onboard -- templates/ngos/sample-ngo-profile.json
npm.cmd run onboard -- templates/companies/sample-company-profile.json
npm.cmd run onboard -- templates/organisations/sample-organisation-profile.json
```

The generated onboarding bundle lands in `data/onboarding/<institution-id>` and can be used by the aggregator without changing Sentinel code.

```powershell
npm.cmd run aggregator -- data/onboarding/st-marys-demo
```

See `docs/TEMPLATE_REPLICATION.md` for the full replication workflow.
