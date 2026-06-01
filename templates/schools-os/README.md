# Schools OS — Template Drop Zone

This folder is where the **Schools OS prototype** lives inside NEXT. When the prototype arrives, drop it here. The agent in NEXT clones this template and customizes it per school using the configurator.

## How NEXT uses this template

```
NEXT OS (mothership)
   └── templates/
        ├── schools-os/        ← you are here (canonical template)
        ├── hospitals-os/      ← future
        ├── homes-os/          ← future
        ├── ngos-os/           ← future
        └── companies-os/      ← future

When a new school onboards:
   1. Agent reads `templates/schools-os/`
   2. Agent reads the school's profile (e.g. st-marys.json)
   3. Agent calls configureTenant(template, profile, dataSource)
   4. A new row appears in Supabase `tenants` table
   5. Sentinel starts watching the school's database
   6. The school leader sees a customized OS instance
```

## What the prototype should contain

When the prototype lands, this folder should look roughly like:

```
schools-os/
├── README.md                 ← this file
├── manifest.json             ← name, version, required modules
├── ui/                       ← React components / HTML for the school's view
│   ├── dashboard.jsx
│   ├── finance.jsx
│   ├── enrollment.jsx
│   └── ...
├── ai-instructions/          ← system prompts for the embedded captain AI
│   ├── bursar-agent.md
│   ├── head-teacher-agent.md
│   └── ...
├── schema.sql                ← any tables the school needs in their own DB
├── seed/                     ← demo data (the current st-marys-demo lives here)
└── adapter-spec.md           ← how the prototype's data maps to HealthSignal
```

## Integration points already in place (the docking clamps)

The mothership-side connectors are already built so the prototype just slots in:

| Mothership file | What it does | What the prototype provides |
|---|---|---|
| `sentinel/shared/src/health-signal.ts` | The contract — every school must emit signals in this shape | Whatever your prototype emits |
| `sentinel/adapters/schools-os.ts` | Transforms the prototype's payload into HealthSignal | One JSON shape (see `RawSchoolsOsPayload`) |
| `sentinel/agent/configurator.ts` | Customizes the template per school | Just a profile.json per school |
| `sentinel/supabase/schema.sql` | Multi-tenant tables: tenants, health_signals, advisories | Nothing — Supabase owns this |
| `sentinel/templates/schools/school-template.json` | The thresholds + tone the agent enforces | Already exists, will be refined |

## When the prototype lands — the integration checklist

1. **Drop the prototype source into this folder** (`schools-os/ui`, `schools-os/ai-instructions`, etc.).
2. **Fill in `adapter-spec.md`** describing what the prototype exposes (REST endpoint? Supabase RPC? Direct SQL?).
3. **Update `sentinel/adapters/schools-os.ts`** — replace the `fetchFromSchoolDatabase` stub with the actual call.
4. **Run the financial-leak demo** against `st-marys-demo` seed data to confirm the wow moment fires.
5. **Wire WhatsApp** (wow moment #2) — a Supabase edge function reads new advisories and POSTs them to Twilio/360dialog.
6. **Spin up tenant #2** to prove the configurator handles multiple schools cleanly (wow moment #3).

## Design constraints (so we don't violate them later)

- **Sentinel advises, doesn't act** — every recommended action carries `humanApprovalRequired: true` until trust is earned.
- **The school's own data stays in the school's own DB** — Sentinel reads from it (with permission), but the canonical source of truth for a school's daily ops is theirs, not NEXT's.
- **NEXT only stores signals + advisories** — health_signals and advisories in Supabase. Not the raw underlying records (no student PII, no patient PII).
- **One template, many tenants** — never fork the template per school. All customization happens via the configurator + profile.json.
