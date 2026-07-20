# System Audit — Architect's Review

> Audit of the 6-module OS, July 2026. Frame: a system is complete when it can survive a bad week, not just run a good one. Gaps are ranked by when they bite: Tier 1 bites during the pilot, Tier 2 bites at scale, Tier 3 is governance maturity.

---

## TIER 1 — Will bite during the pilot (build before or during month 1)

### 1. Staff rota / scheduling — the biggest hole
The whole safety model rests on child:staff ratios (02), but nothing SCHEDULES staff. Ratios aren't a policy problem, they're a rostering problem: who covers the 7am opening, lunch breaks without breaking ratios, sick-day cover chain. Without a rota system, ratio compliance is luck.
→ Needs: `02-staff-system/context/rota-scheduling.md` — weekly rota template, break coverage rules, on-call cover list, minimum-staffing table per room per hour.

### 2. Curriculum & learning program — inputs are missing
Module 01 measures outcomes (milestones) but nothing defines inputs: what is actually taught each week. Teachers will improvise, and improvisation doesn't scale or audit. The faith curriculum especially — core brand identity with no defined story/verse/song rotation.
→ Needs: `01-child-profile` sibling module or `context/weekly-learning-plan.md` — age-band activity plan, faith curriculum rotation (term of stories, verses, songs), linkage to milestone domains.

### 3. Absence management — silent children are a signal
Sign-in/out logs presence; nothing acts on ABSENCE. Child absent unannounced by 9:30 → call (safeguarding + care signal). Two children from one class out with fever → outbreak detection. Absence also hits revenue (monthly plans) and quality data.
→ Needs: `05-operations/context/absence-followup.md` — 9:30 unexplained-absence call rule, illness pattern log, return-to-care check.

### 4. Financial controls — money without controls invites leakage
06 computes revenue, 04 reports it, but nothing controls cash: who touches money, petty cash rules, two-person counts, daily banking, receipt-for-everything, bank/mobile-money reconciliation. Most small-center losses are here, not in pricing.
→ Needs: `06-billing-engine/context/financial-controls.md` — cash handling, petty cash imprest, weekly reconciliation checklist, segregation of duties (person who records ≠ person who banks).

### 5. Continuity: power, internet, device loss
Digital-first recording fails on a dead tablet or power cut. No fallback = the day goes unrecorded and billing breaks.
→ Needs: `05-operations/context/continuity-plan.md` — paper fallback pack per room (printed daily-log sheets), end-of-day catch-up entry rule, device charging/backup rota, where digital records are backed up and how often.

### 6. Visitor & contractor log
Anyone not staff/parent in the building is currently invisible to the system. Safeguarding hole.
→ Needs: visitor log + escort rule in `05-operations` (can live inside pickup-dropoff.md or its own file).

---

## TIER 2 — Will bite at scale (build in months 2–4)

### 7. Compliance & licensing calendar
License renewals, inspection readiness, fire certificates, insurance policies, staff certification expiries — scattered or absent. One missed renewal can close a center.
→ Needs: `04-owner-view/context/compliance-calendar.md` — every credential with expiry date, renewal owner, 60/30-day alerts. Feeds the quality scorecard.

### 8. Center Launch Playbook — the actual scaling instrument
The scorecard says WHEN you may open center #2; nothing says HOW. Site criteria, licensing timeline, hire-and-train lead times (manager hired 8+ weeks before opening, trained inside center #1), pre-opening checklist, first-90-days plan.
→ Needs: new module `07-expansion/` — this is the franchise-in-a-box document set; it's also what an investor pays for.

### 9. Marketing & enrollment growth engine
The funnel is tracked (inquiries → tours) but nothing GENERATES inquiries: referral program mechanics, church/school/community partnerships, open-day playbook, waitlist nurture messages. Occupancy % is the #1 profit lever and it has no engine.
→ Needs: `03-parent-experience/context/growth-engine.md` or module — referral reward rules, partnership outreach templates, open-day run sheet, waitlist communication cadence.

### 10. Full staff lifecycle (beyond hire + train)
Missing: payroll inputs (hours → pay, feeds from rota), leave management, performance-issue/discipline procedure, termination + exit interview, staff wellbeing pulse. Turnover is the quality killer in childcare; retention needs a system, not goodwill.
→ Needs: `02-staff-system/context/` additions — leave-and-payroll.md, performance-and-discipline.md.

### 11. Risk register & insurance
Incidents are logged reactively. No forward risk register (what could hurt us: drowning hazard, food poisoning, vehicle, reputational) with mitigations and insurance mapping; no media/crisis response one-pager (a child-injury story moving on WhatsApp needs a 1-hour response plan).
→ Needs: `04-owner-view/context/risk-register.md` + crisis-communication one-pager in 03.

---

## TIER 3 — Governance maturity (months 4+)

### 12. Data privacy & records governance
Child photos, medical data, family finances — sensitive data with no rules: who accesses what, retention after a family leaves, consent register audit, breach response. Do this before the app exists, not after.
→ Needs: `00-governance/data-policy.md`.

### 13. Template change control
Templates ARE the operating standard; today anyone could edit one. Needs a simple rule: templates versioned, changes approved by owner, dated changelog per file. One line in root CLAUDE.md + a CHANGELOG.md.

### 14. Child transitions & graduation
Room-to-room transition readiness (toddler → preschool), and the graduation handoff: a final development portfolio to the family and next school — a marketing asset AND a care asset. Alumni list for referrals.
→ Needs: `01-child-profile/context/transitions-graduation.md`.

### 15. Feedback instruments
Parent satisfaction is 20% of the quality score, but no actual survey instrument exists. Same for staff exit interviews.
→ Needs: termly parent survey (5 questions max) in 03; exit-interview form in 02.

---

## Consistency fixes found (small, done in this audit)
- START-HERE fill order didn't include the billing engine → added week 4 billing go-live.
- Weekly owner report's "four numbers" ignored money owed → added unbilled/overdue to the four numbers row.
- Quality scorecard doesn't yet weigh billing health (unbilled hours, aging) — fold into "Facility & ops" or re-weight at first revision.

## Architect's verdict
The core loop (record once → parent trust → owner visibility → money follows time) is sound. The system as-built runs a good week. What's missing is what survives a bad one: no rota, no absence action, no cash controls, no power-cut fallback. Build Tier 1 before enrollment day. Tier 2 is the difference between owning a daycare and owning a childcare COMPANY — the launch playbook (#8) is the single highest-leverage document on this list.
