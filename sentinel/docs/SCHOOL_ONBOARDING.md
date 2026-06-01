# School Onboarding Template

Use `templates/schools/school-template.json` as the canonical Sentinel template for K-12 deployments. Each new school only needs a small profile file with identity, capacity, fees, and local data-source names.

## Create a New School Bundle

```powershell
cd .\sentinel
npm.cmd run build
npm.cmd run onboard:school -- templates/schools/sample-school-profile.json
```

This creates:

- `data/onboarding/<school-id>/profile.json`
- `data/onboarding/<school-id>/finance.json`
- `data/onboarding/<school-id>/operations.json`
- `data/onboarding/<school-id>/sentinel-policy.json`
- `data/onboarding/<school-id>/advisory-seed.json`

To ingest that generated school immediately:

```powershell
npm.cmd run aggregator -- data/onboarding/st-marys-demo
```

To onboard another school, copy `sample-school-profile.json`, change the school-specific fields, and run the same command with the new profile path. The Sentinel loops stay unchanged.

## What Replicates

- Fee collection KPI structure
- Enrollment thresholds
- Resource and energy monitoring defaults
- Human-in-the-loop governance policy
- Board advisory tone and local-only operating constraints
