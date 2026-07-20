# Leave & Payroll Processing

> A childcare center runs on reliable staff. Payroll must be perfectly accurate, and leave must be managed so ratios never break.

## 1. Payroll Inputs
Payroll is calculated based strictly on the Staff Rota logs in Armani OS, not on scheduled hours.
- If a staff member is scheduled for 8 hours but logs 9, they are paid for 9 (subject to overtime approval).
- **The Weekly Lock:** Every Sunday evening, the Branch Manager must lock the timesheets. Any discrepancies must be resolved before this lock.

## 2. Leave Requests
All leave (annual, sick, or unpaid) must be logged in the system.
- **Notice Period:** Annual leave must be requested at least 14 days in advance to allow for rota adjustments.
- **The 20% Rule:** No more than 20% of the teaching staff at any single branch may be on leave simultaneously. The OS will flag any leave request that breaches this threshold.

## 3. Sick Leave & Cover
If a staff member calls in sick:
- The Branch Manager immediately queries the `onCallPool` within the Staff Rota system to find a replacement.
- The absence is logged as sick leave, triggering payroll adjustments automatically based on the staff member's contract tier.
