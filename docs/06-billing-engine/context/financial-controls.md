# Financial Controls & Cash Management

This document defines the strict financial governance rules for Armani OS, designed to prevent cash leakage, ensure traceability, and mandate segregation of duties.

## 1. Segregation of Duties
To prevent fraud and errors, the following duties must never be performed by the same individual:
- **Recording vs. Banking:** The person who logs the receipt of cash/mobile money in the system must not be the same person who physically deposits it at the bank.
- **Approving vs. Spending:** All expenses, without exception, must be approved by the Global Director before funds are disbursed or replenished.

## 2. Petty Cash Imprest System
The centers operate on an imprest petty cash system to handle small, day-to-day operational expenses (e.g., emergency supplies).
- **Float Limit:** Each branch maintains a strict petty cash float limit (e.g., 200,000 UGX).
- **Request Workflow:** 
  1. Branch Manager submits a Petty Cash Request with a stated purpose and estimated amount.
  2. Global Director reviews and explicitly approves the request.
  3. Once approved, the funds are marked as "Disbursed" from the float.
  4. Branch Manager must upload/log a receipt after the purchase.
- **Replenishment:** The float is only replenished by the Global Director after all receipts for the period have been verified and reconciled.

## 3. Revenue Reconciliation
Revenue collection (cash, mobile money, bank transfers) must be reconciled weekly.
- **System Log:** The `Hours Ledger` automatically calculates the expected revenue based on attendance (Money Follows Time).
- **Physical Count:** The Branch Manager performs a daily tally of physical cash and mobile money receipts.
- **Reconciliation:** The Global Director compares the System Log against the Physical Count and the Bank Statements to identify any discrepancies. Any shortfall must be investigated immediately.

## 4. Inventory Purchasing
Inventory is tracked globally across all branches.
- **Low Stock Alerts:** Items with a quantity below a defined threshold trigger an automatic alert to the Global Director.
- **Purchase Requests:** Similar to petty cash, any inventory purchase requires explicit Global Director approval before funds are released.
