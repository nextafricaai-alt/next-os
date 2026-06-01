# Peak Primary School — Deep Context

Peak Primary is NEXT's first wired Schools OS tenant. Located in
Uganda. Live as of 2026. This is the school Nia knows most deeply.

## The fundamentals

- **Students:** 286 across all grades
- **Teachers:** 38
- **Streams:** 14 total — P1 through P7, two streams per grade
  ("Vigilant" and "Prudent")
- **Term:** Term 2 of the academic year, currently Week 6
- **Currency:** UGX (Ugandan shillings)
- **Tenant ID in the OS:** `peak-primary` (always this exact slug)

## Current state (live signals)

- **Fee collection: 71%** of expected Term 2 fees collected. Industry
  benchmark target is 85%+. Gap is 168.8M UGX still expected.
- **3 accounts overdue 30+ days** — 1.08M UGX outstanding combined.
  These are the highest-priority follow-ups.
- **Weekly attendance: 88%** — below the 92% target. 12 students
  flagged as "at-risk" (attendance under 70% for 2+ weeks).
- **4 new enrollment inquiries** waiting in the WhatsApp queue. P1 and
  P3 intake.
- **Revenue this term:** 412.5M UGX collected. Expected total: ~580M.
- **Expenses this term:** 384.2M UGX (salaries, materials, facilities).

## Stream structure

Each grade has two streams that compete in healthy ways:

- P1V (Vigilant) / P1P (Prudent)
- P2V / P2P
- P3V / P3P
- P4V / P4P
- P5V / P5P
- P6V / P6P
- P7V / P7P

When referring to a student's class, always use the stream code (e.g.
"P4V") not "Primary 4."

## Key relationships

- **Head Teacher** — the school's day-to-day leader. First point of
  contact for operational issues.
- **Bursar** — handles fee collection, accounts, financial reporting.
- **Guardians/Parents** — primary external audience. Most communication
  happens via WhatsApp on personal phones. Mothers more responsive on
  daytime messages; fathers reachable evenings.

## How Peak Primary communicates

- **WhatsApp dominant.** Almost every parent reachable via WhatsApp.
- **English primary, Luganda for warmth.** Open in English; sign off
  with a Luganda phrase when warmth matters ("Webale nnyo" = thank
  you very much).
- **Tone with guardians:** respectful, never demanding. Even on
  overdue fees — frame as partnership, not collection.

## Three live workflows Nia helps with

1. **Overdue fee reminders** — 3 accounts right now. Draft warm
   WhatsApp, Hudson approves, send via `open_whatsapp` or
   `send_whatsapp`.
2. **Attendance follow-ups** — when a student is at-risk (12 right
   now), check in with the guardian: "We noticed [name] hasn't been
   in this week — is everything okay?"
3. **Enrollment pipeline** — 4 new inquiries waiting. First touch
   should be within 24 hours. Acknowledge, share the info pack, book
   a school visit.

## The live prototype

Hudson can open the Peak Primary OS at:
`prototypes/schools/peak-primary/index.html`

It's a fully wired React prototype with student lists, fee ledger,
attendance dashboard, and live signal feed. Nia supervises it via
`read_tenant("peak-primary")` and `evaluate_health("peak-primary")`.
