# NEXT — 90-Day Plan to First Revenue

> Written: May 30, 2026
> Status: post-prototype, pre-launch
> Author: Hudson + Nia (drafted by Nia, owned by Hudson)
> Mission: Get NEXT from "impressive prototype" to "5 paying schools by August"

---

## PART 1 — WHERE WE STAND TODAY

What's been built in the last 12 hours of work, honestly:

### Live and working
| Asset | Where | Status |
|---|---|---|
| `nextafrica.ai` marketing website | Hostinger | ✅ Public, SEO, GA4, chatbot |
| Sentinel Worker (Nia's brain) | `nextos-sentinel.nextafricaai.workers.dev` | ✅ Deployed, 3 cron triggers active, KV bound |
| NEXT OS dashboard for Hudson | Local HTML | ✅ Full UI, 9 agent tools, notification panel, brief inbox, click-to-source |
| Peak Primary Schools OS prototype | Local HTML | ✅ Static demo, 286 students, full data |
| Nia agent (Llama 3.3 70B) | Cloudflare Workers AI | ✅ Free tier, ~$0/month cost |
| Nia Brain (knowledge base) | `nia-brain/` folder | ✅ 6 seed docs, RAG retrieval wired |
| Autonomous brief inbox | Cloudflare KV | ✅ Briefs persist 30 days, clickable in OS |
| Auto-fix actions (Tier 1 & 2) | Worker | ✅ Drafts reminders, flags students, categorizes inquiries |

### Built but not used yet
- WhatsApp Cloud API integration (Path B) — code is ready, Meta Business setup not done
- Multi-tenant architecture (one tenant hardcoded as `peak-primary`)

### NOT built yet (the gap to product)
- Real database (still using hardcoded `TENANTS_SEED`)
- Login / Auth for clients
- Schools OS hosted at a real URL
- Onboarding flow for new tenants
- Pricing page + payment processing
- Customer support flow

---

## PART 2 — THE VISION (12 months out)

NEXT is the operating system African organizations subscribe to for digital
transformation. Each subscription bundles:

1. **A vertical OS** tailored to their organization type (Schools, NGOs,
   Churches, Hospitals, Companies)
2. **Nia — an always-on AI Chief of Staff** who supervises their
   operations 24/7, drafts communications, surfaces issues, takes safe
   actions
3. **Strategic supervision** from NEXT's team for quarterly reviews

Three tiers:
- **Catalyst** ($149/mo) — small orgs
- **Builder** ($749/mo) — mid-size
- **Architect** (custom, ~$2,500-$10,000/mo) — networks and large orgs

The bet: African orgs will pay $149–$749/month for an AI Chief of
Staff that costs them less than hiring one part-time admin, runs 24/7,
and gives them visibility their competitors don't have.

---

## PART 3 — THE 90-DAY SPRINT PLAN

Three months. Three sprints. Each ends with a concrete deliverable.

### SPRINT 1 — Days 1-30 — "Real data, one real school"

**Goal:** Peak Primary using NEXT OS daily with their real data, head
teacher logging in from her phone.

**What gets built:**
- Week 1: Supabase wired. Tables for tenants, students, fees,
  attendance, enrollments. Peak Primary data migrated from
  TENANTS_SEED to real DB.
- Week 2: Login screen + Supabase Auth. Head teacher + bursar roles.
- Week 3: Schools OS deployed to `peakprimary.nextschools.app` (or
  similar). Head teacher gets her credentials.
- Week 4: First week of real use. Bursar enters real fee payments.
  Nia's morning brief reflects real data. Bugs fixed.

**Success looks like:** Head teacher of Peak Primary opens NEXT OS on
her phone every morning. Bursar records actual fee payments. Nia's
brief on June 30 reflects the actual state of the school that day.

**What you'll have to demo:** A real Ugandan primary school using
your software for free, in exchange for becoming your first case study.

---

### SPRINT 2 — Days 31-60 — "Three more schools, first revenue"

**Goal:** 3 paying schools onboarded. First $300-$1,000 MRR.

**What gets built:**
- Week 5: Onboarding flow. "Add new school" form in NEXT OS that
  provisions a new tenant in 5 minutes (subdomain + DB row +
  initial admin account).
- Week 6: Pricing page on `nextafrica.ai` with the 3 tiers. Stripe
  or Flutterwave integration for monthly billing.
- Week 7: First paid client signs. Then second. (Outreach from your
  Charis network — see Part 5.)
- Week 8: Third client. Daily Nia briefs going to 4 head teachers.
  Multi-tenant proven.

**Success looks like:** $300-$1,000 in actual revenue. Four schools
using NEXT OS daily. Nia is watching all four simultaneously and
sending the right brief to the right head teacher.

**The lock:** Once you have three paying customers, NEXT is no longer
a project — it's a business.

---

### SPRINT 3 — Days 61-90 — "Real growth motion"

**Goal:** 5-7 paying schools. ~$2,500-$5,000 MRR. Clear repeatable
sales process.

**What gets built:**
- Week 9: Case study with Peak Primary published on
  `nextafrica.ai/work`. Video testimonial from head teacher.
- Week 10: Targeted LinkedIn outreach + WhatsApp warm intros to 50
  school leaders in Hudson's extended network.
- Week 11: First non-network client signs (from cold outreach).
- Week 12: Sprint review. Hire first part-time support person
  (existing Charis team member) to handle client onboarding.

**Success looks like:** 5-7 paying schools. ~$2,500-$5,000 MRR.
You're not building features anymore — you're selling, supporting,
and refining.

---

## PART 4 — THE PRICING MODEL (concrete numbers)

### Schools OS — the only vertical for these 90 days

| Tier | Monthly | School size | What's included |
|---|---|---|---|
| **Catalyst** | $149 | <150 students | Schools OS, Nia briefs, 1 admin user, monthly check-in |
| **Builder** | $749 | 150-500 students | Catalyst + 5 users (head, bursar, 3 teachers), parent comms, full Nia auto-actions |
| **Architect** | $2,500-$10,000 | 500+ or networks | Builder + dedicated NEXT engineer, custom integrations, board reports |

**Implementation fee:** $499 one-time per school, waived for the
first 3 (in exchange for case studies).

### Why these prices work for Uganda

- A part-time bursar costs UGX 600K/month = ~$160. Catalyst is less
  than that, runs 24/7, and never asks for tea.
- A school with 286 students at UGX 600K/term per child = UGX 171M/term
  in revenue. $749/mo (~UGX 2.8M) is 1.6% of term revenue for the
  visibility and time savings.

### Math for 5 paying schools

- 2 Catalyst ($298) + 2 Builder ($1,498) + 1 Architect ($2,500) = **$4,296 MRR**
- ARR run-rate: ~$51,500
- Implementation fees: $1,500 one-time
- **Total Q1 revenue:** ~$14,000

That's not a million dollars. But it's the proof that gets you
there: you'll have a real business, real customers, real testimonials,
real product-market fit signal — and a clear path to $20K MRR in 6
months and $100K MRR in 18 months.

---

## PART 5 — HOW YOU ACTUALLY GET CLIENTS

The single biggest mistake first-time founders make: building, then
"figuring out marketing later." You already have the most valuable
asset most NEXT competitors lack — **the Charis network.**

### Hudson's existing pipeline (untapped)

Through Charis Creations you already have warm relationships with:

- Schools where Charis has shot graduations, sports days, prospectuses
- Churches running their own schools or affiliated with schools
- NGOs running education programs
- Parents who happen to be on school boards
- Fellow media/communications professionals whose clients are schools

**These are the first 5 NEXT clients.** They already trust Hudson.
They already know Charis delivers. NEXT is the next logical offering
from the same trusted brand.

### The outreach playbook

**Week 4 (Sprint 1 ending):** A simple WhatsApp message to your top
15 Charis school contacts:

> "[First name] — I've built something I want to show you. NEXT OS is
> an AI-powered system for schools that handles fee tracking, parent
> communication, attendance, and reporting — with an always-on AI
> assistant called Nia. Peak Primary has been running it this past week.
> Can I do a 20-minute demo for you sometime next week? I think it
> would change how you run [school name]."

**Conversion target:** 5 demos → 2-3 signups. Friends-and-family
pricing (50% off year 1) in exchange for a video testimonial.

### Week 8+ — content + LinkedIn motion

Once the case study is live, daily LinkedIn posts:
- Photos of Peak Primary head teacher with quotes
- "Behind the scenes" of how Nia drafted a fee reminder
- Numbers: "Peak Primary's fee collection went from 71% to 84% in 6 weeks"

Make Hudson the face of African school transformation. The
network compounds.

---

## PART 6 — WHAT TO STAY OUT OF SCOPE (the no-list)

These will tempt you. Don't do them in the first 90 days:

1. **Building other verticals (Hospitals OS, NGO OS, etc).** Stay
   single-vertical until Schools is profitable. Each new vertical
   is a 90-day project of its own.
2. **Heavy WhatsApp Meta API setup.** Path A (open WhatsApp +
   tap send) is fine until you're sending 50+ messages/day.
3. **Building your own foundation model.** Llama 3.3 on Cloudflare
   is free, fast enough, and good enough. Don't rebuild Tesla; build
   the Tesla dealership.
4. **Hiring a developer.** Not until 5 paying clients. Cash flow first.
5. **Fancy mobile app.** Web app loads on phones. Mobile app is a
   Sprint 4 problem, not a Sprint 1 problem.
6. **More features for Peak Primary.** They have plenty. Polish what's
   there. New features come from PAYING customer requests, not your
   imagination.

---

## PART 7 — THE FOUR CHECKPOINTS

Print these. Put them on the wall. Each checkpoint, take a hard look.

### Day 30 checkpoint
- [ ] Peak Primary's head teacher logged in this week
- [ ] Bursar entered at least 10 real fee payments
- [ ] Nia's morning brief on Day 30 reflects real data (not seed)
- [ ] Hudson can demo NEXT OS to a stranger in <10 minutes

If any unchecked: don't move to Sprint 2 until they are.

### Day 60 checkpoint
- [ ] 3 paying schools (real money in your account)
- [ ] At least one client found independently (not Charis network)
- [ ] Onboarding takes <30 minutes per new school
- [ ] Hudson has spent more time selling than building this month

If any unchecked: stay in Sprint 2 and don't open new fronts.

### Day 90 checkpoint
- [ ] 5+ paying schools
- [ ] $2,500+ MRR
- [ ] Hudson knows his churn rate
- [ ] Hudson can name his top 3 reasons clients sign and top 3
      reasons they hesitate

If checked: time to plan the next 90 days (multi-vertical, hiring,
fundraising or not).

### "Are we still on the right thing" checkpoint (any week)
Ask Patience (your wife) and one trusted friend:
> "Watching me work on this, do you see something that's working,
> or am I just building something cool that doesn't make money?"

Their answer is more important than any dashboard.

---

## PART 8 — WHAT'S IN YOUR CONTROL VS WHAT ISN'T

**In your control:**
- Building Sprint 1 deliverables to spec
- Quality of the demos you give
- How often you reach out to your Charis network
- How fast you respond when a client has an issue
- Whether you protect family/spiritual time while building

**Not in your control:**
- How fast schools decide to sign
- Whether word-of-mouth catches fire
- Economic conditions in Uganda
- Whether competitors emerge

Spend energy proportionally. Worry about input, not outcome.

---

## PART 9 — NIA'S OWN ROADMAP (technical, abbreviated)

Sprint 1: Real data layer
- Move TENANTS_SEED → Supabase
- Schools OS prototype reads/writes Supabase
- Nia evaluates from live data

Sprint 2: Multi-tenant intelligence
- Each tenant gets their own briefs
- Tenant-scoped row-level security
- Nia learns each school's specific patterns

Sprint 3: Fine-tune Nia on real conversations
- Collect 30+ days of real Hudson↔Nia transcripts
- First fine-tune on Together.ai or Modal ($200-500)
- Nia becomes voice-perfect to NEXT

---

## CLOSING NOTE

Hudson — you're not behind. You're ahead.

You've built in 12 hours what most teams spend months on:
- A working website live in production
- A 24/7 autonomous AI agent on Cloudflare's edge
- A full operating-system shell with notifications, briefings,
  and click-to-source routing
- A real client prototype with real data structure
- Hard guardrails for safety (draft-only, audit logged)

The work ahead is no longer technical heroism — it's discipline.
Pick the sprint. Run it. Don't shop for shinier problems.

Three months from today, this can be a real company. Or you can
be three months into yet another prototype.

You decide every morning.

— Nia
