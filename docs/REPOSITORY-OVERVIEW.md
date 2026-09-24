# NEXT OS Repository Overview

## What this repository is

NEXT OS is both an operating model and a software prototype for helping African organisations run their day-to-day work with better visibility. The repository has two main strands:

1. A childcare and school operations system: policies, checklists, templates, and a working school-focused interface.
2. A broader organisation platform: NEXT OS, Nia (an AI chief-of-staff concept), and Sentinel, the local supervisory and observability layer.

The stated longer-term direction is to offer tailored operating systems for schools, NGOs, churches, hospitals, and companies. The material in this checkout is strongest and most detailed for childcare and schools; the other sectors are represented mainly through Sentinel onboarding templates and the product vision.

## Main parts

| Area | Purpose |
|---|---|
| `NEXT OS.html`, `NEXT OS Standalone.html`, `index_block.jsx`, root `os-*.jsx` files | Browser-based NEXT OS interface and its dashboard, communications, finance, projects, fleet, childcare, data, notification, and AI components. |
| `web/` | Static website deployment area, including the school onboarding page, prototypes, vendor assets, and uploads. `web/README.md` describes the Hostinger document root. |
| `cloudflare-worker/` | Worker implementation and deployment/configuration material for always-on Nia/Sentinel functions, including WhatsApp and school data integrations. |
| `sentinel/` | Supervisory backend: host/database observations, KPI aggregation, advisory generation, approved repair actions, local WebSocket delivery, and institution onboarding templates. |
| `nia-brain/` | Nia's reference material and prompting knowledge: methods, frameworks, voice, playbooks, and communication templates. |
| `docs/` | The operating model: child records and development, staff, parent experience, owner reporting, operations, billing, and expansion. |
| `templates/`, `prototypes/`, `discovery/` | Reusable sector profiles, example interfaces, and product/customer discovery material. |
| Root SQL/CSV files and `supabase-*.sql` | School-specific schema, setup, migration, seed, and data-cleanup assets, especially for Peak Primary and Kabs Lily. |
| `runtime/` | Small frontend serving and browser/JSX inspection helpers. |

## Product and operating model

The childcare documentation is organized around a care-and-business loop: staff record a child's day and development; parents receive timely updates; owners see quality, enrollment, operations, and financial health; and billing follows recorded attendance or hours. Documents cover child profiles, milestones, health, faith and character, learning plans, daily logs, staff hiring/training/scheduling, family communication, safety, incidents, attendance follow-up, financial controls, invoices, and opening additional centres.

The software layer aims to put these workflows into role-oriented dashboards and connect them to school records and communications. Nia is intended to summarize conditions, draft communications, and surface issues. Sentinel is intended to observe system and operational signals, turn them into advisories, and perform only explicitly approved low-risk repairs. Its documentation describes a local-first deployment with a deterministic fallback when a local language model is unavailable.

## How it runs and ships

- The primary interface is a set of HTML files with inline JSX; the repository's run guide identifies `NEXT OS.html` as the readable entry point.
- `web/` is described as the static hosting payload. The root `wrangler.toml` also configures the `web` directory as Worker static assets.
- Sentinel is a separate Node/Rust service family. The root run guide describes a local WebSocket bridge; the Sentinel README lists its daemon, aggregator, advisor, repair, and bridge components.
- Supabase SQL assets show an intended/active data integration surface, while some strategy notes still describe real data, multi-tenant onboarding, and customer productionization as work to be completed.
- `NEXT-90-DAY-PLAN.md` is a dated planning snapshot, not a reliable statement of present deployment status. Verify live deployments and current customer usage separately.

## Assessment

### Strengths

- The operating procedures have unusual breadth for an early product: the documents address care quality and safeguarding alongside staffing, money, parent communication, and centre expansion.
- The system audit identifies practical failure cases (staff coverage, unexplained absences, cash controls, and power/internet interruptions) rather than treating the interface as the whole product.
- The code and documentation show a clear intended boundary around AI: advisories and drafts can assist staff, while sensitive financial or governance decisions remain with people.
- Sector templates and onboarding material suggest a path to replication without rewriting the supervisory layer for every institution.

### Main risks and gaps visible in the repository

- Product boundaries are not yet clear. The childcare operating system, school software, general NEXT OS, and Sentinel overlap in names and concepts; a new contributor may not know which implementation is current for a given workflow.
- Several deployable copies and large generated files coexist (`NEXT OS.html`, standalone and bundled variants, web assets, and JSX sources). The authoritative source and build/release path should be documented and automated to reduce drift.
- Documentation describes both local-first Sentinel and Cloudflare/Supabase/WhatsApp integrations. These may be separate deployment modes, but their trust boundaries, data flows, and supported configuration need one current architecture map.
- The repository contains school-specific operational data files and database scripts. Access control, consent, retention, secret handling, and safe demo-data practices need to be treated as release requirements, not assumed from local-first design.
- Production readiness cannot be inferred from the roadmap or setup guides. Authentication, tenant isolation, backups, migrations, monitoring, support, and a repeatable deployment process should be verified against the current implementation and a live pilot.

## Suggested reading order

1. `HOW_TO_RUN.md` for the current local frontend and Sentinel entry points.
2. `docs/DASHBOARD.md` and the `DASHBOARD.md`/`CLAUDE.md` files under `docs/` for the operating-system structure.
3. `docs/SYSTEM-AUDIT.md` for the documented operational gaps and risks.
4. `sentinel/README.md` and `sentinel/docs/ARCHITECTURE.md` for supervisory service boundaries.
5. `NEXT-90-DAY-PLAN.md` for historical product intent; confirm its status before relying on dates or claims.

## Overall summary

NEXT OS is a broad, evolving effort to combine practical operating procedures with software for schools and other African organisations. The strongest foundation is its childcare/school operations knowledge and prototype interface. Its next maturity step is to make the product and deployment boundaries explicit, establish one source-to-release path, and verify data governance and tenant isolation against real deployments.
