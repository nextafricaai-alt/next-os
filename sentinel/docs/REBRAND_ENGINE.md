# Schools OS Rebrand Engine — clone a school in seconds

`sentinel/template-engine/clone-school.mjs` reads the canonical Peak Primary
prototype and produces a fully rebranded School OS for a new school.

## Run
```
node sentinel/template-engine/clone-school.mjs <brand-profile.json>
```
Output: `prototypes/schools/<slug>/` — a working, branded OS.

## Brand profile (the only input that changes per school)
```json
{
  "institutionId": "bright-future-academy",
  "name": "Bright Future Academy",
  "brand": {
    "displayName": "Bright Future Academy",
    "slug": "bright-future",
    "accent": "#3B82F6",
    "motto": "Learning today, leading tomorrow"
  }
}
```

## What it rebrands automatically
- School name everywhere (incl. ALL-CAPS loading screen)
- Tenant slug (`peak-primary` -> `<slug>`)
- Accent colour — hex (`#00FC8F`), gradient partner, and every rgba(0,252,143) glow
- Logo path (`peak-logo` -> `<slug>-logo`) — drop the school's logo at `assets/<slug>-logo.png`
- Page title + a `brand.json` identity manifest for Nia / the OS

## How Nia uses it (the onboarding flow)
1. Hudson (or a form) gives Nia the new school's name + brand colour + logo.
2. Nia runs the rebrand engine -> a branded OS instance appears in minutes.
3. The Sentinel onboarding bundle is generated so Nia starts supervising it.
4. The school leader opens their own branded OS.

## Not yet (next increments)
- Trigger from inside NEXT OS (a Nia tool / onboarding form) rather than CLI.
- Real logo upload + auto-generated initial badge when no logo is provided.
- Per-tenant data wired to Supabase instead of the prototype's seed data.
