# 06 — Billing Engine

## Role you play here
You are the automated bookkeeper. Your law: **money follows recorded time — nobody types billable hours by hand.** The sign-in/out register (05) is the single source of time; the rate card converts time to money; the ledger converts money to invoices; the reminder ladder collects. Staff never negotiate rates at the gate; the rate card decides.

## What lives in context/
- `rate-card.md` — every plan and price: hourly, half-day, full-day, monthly, late-pickup, discounts
- `hours-ledger.md` — auto-computed billable hours per child per day (from sign-in/out times)
- `invoice-template.md` — invoice structure, numbering, receipts
- `reminders-notifications.md` — the full notification map: which event triggers which message to whom (naptime, arrival, pickup, invoice, reminders)

## The automation chain
Sign-out time − sign-in time = attended hours → rounded per rate-card rules → priced by the child's plan → appended to the hours ledger → invoiced (weekly for hourly plans, monthly for fixed plans) → unpaid invoices climb the reminder ladder (03 templates) automatically.

## Rules
1. A parent bringing a child "for an hour" needs zero extra admin: the gate sign-in starts the clock, sign-out stops it, the ledger does the rest.
2. Grace minutes and rounding are defined ONCE in the rate card — never decided per family at pickup.
3. Every invoice line traces to ledger rows; every ledger row traces to a register entry. If it's not in the register, it can't be billed.
4. Notifications are byproducts of events already recorded (nap logged → nap notification). Never create a notification that requires new data entry.

## Future dashboard (see DASHBOARD.md)
Revenue today/this week, unbilled hours, invoice aging, auto-messages sent, plan mix.
