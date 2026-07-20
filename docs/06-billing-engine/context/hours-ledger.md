# Hours Ledger — auto-computed billable time

> One row per child per day, derived from the sign-in/out register (05). During the pilot a designated admin fills this daily in 5 minutes from the register (or a simple spreadsheet formula does it); in the app it computes itself the moment a child signs out.

## The computation (worked example)
1. Sign-in 09:02, sign-out 10:11 → attended 1h 09m
2. Minus 10 min grace → 59m → round up to 30-min block → 1.0 h... (per rate-card rules)
3. Child's plan = Hourly → 1.0 h × hourly rate = amount
4. Row appended below; Friday's invoice sums the week's rows. Parent did nothing; staff did nothing extra.

## Ledger — Center: ______  Week of: ______
| Date | Child | Plan | Sign-in | Sign-out | Attended | Billable (after grace/rounding) | Rate applied | Amount | Overrun/late fee | Invoiced (inv #) |
|---|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |  |

## Weekly close checklist (Friday, before invoicing)
- Every register entry has a ledger row: ☐
- Overruns and late pickups computed: ☐
- Sibling discounts applied: ☐
- Hourly-cap protection applied where cheaper: ☐
- Ledger total handed to invoicing: ☐  Signed: ______

**Future dashboard:** running clocks for hourly children in the building now; unbilled hours counter; week's accrued revenue live.
