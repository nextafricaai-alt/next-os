# NEXT Sentinel Template Replication

Sentinel can replicate from template profiles for:

- Schools: `templates/schools/sample-school-profile.json`
- Churches: `templates/churches/sample-church-profile.json`
- NGOs: `templates/ngos/sample-ngo-profile.json`
- Companies: `templates/companies/sample-company-profile.json`
- Organisations: `templates/organisations/sample-organisation-profile.json`

## Onboard Any Client Type

```powershell
npm.cmd run build
npm.cmd run onboard -- templates/churches/sample-church-profile.json
npm.cmd run onboard -- templates/ngos/sample-ngo-profile.json
npm.cmd run onboard -- templates/companies/sample-company-profile.json
npm.cmd run onboard -- templates/organisations/sample-organisation-profile.json
```

Each command writes a bundle to:

```text
data/onboarding/<institution-id>
```

Then ingest the generated bundle:

```powershell
npm.cmd run aggregator -- data/onboarding/<institution-id>
```

## Minimal Profile Fields

For churches, NGOs, companies, and organisations, change only:

- `institutionId`
- `name`
- `templateType`
- `country`
- `district`
- `currency`
- `operatingYear`
- `capacityThreshold`
- `activeParticipants`
- `revenueStreams`
- `expenseStreams`
- `governanceContacts`

The template supplies KPI defaults, threshold rules, modules, advisory tone, governance policy, and local-only constraints.

