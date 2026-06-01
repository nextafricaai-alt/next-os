/**
 * The Pay Hand — Hand #8
 * ----------------------
 * Initiates mobile-money flows (M-Pesa, MTN MoMo, Airtel Money) and card
 * payments (Flutterwave, Paystack). The Pay Hand NEVER moves money without
 * an explicit human approval via WhatsApp or the dashboard.
 *
 * Two-phase protocol:
 *   1. propose: the brain proposes a payment. Hand returns a paymentIntentId
 *               and a preview the human can review. Status = "pending-approval".
 *   2. confirm: a human (with appropriate role) confirms with the intent id.
 *               Hand executes via the chosen provider adapter.
 *
 * This separation means the brain can propose freely; the audit log shows
 * every proposal; only approved ones become real movements of money.
 */

import type { Hand, HandContext, HandResult } from "../hand.js";

export type PayProvider = "mpesa" | "mtn-momo" | "airtel-money" | "flutterwave" | "paystack";

export type PayArgs =
  | {
      op: "propose";
      provider: PayProvider;
      amount: number;
      currency: string;
      to: string; // recipient phone (mobile money) or account ref (card processor)
      memo: string;
      tenantId: string;
    }
  | { op: "confirm"; paymentIntentId: string }
  | { op: "cancel"; paymentIntentId: string };

export interface PaymentIntent {
  id: string;
  tenantId: string;
  provider: PayProvider;
  amount: number;
  currency: string;
  to: string;
  memo: string;
  status: "pending-approval" | "confirmed" | "cancelled" | "settled" | "failed";
  proposedAt: string;
  resolvedAt?: string;
  providerRef?: string;
}

export type PayResult =
  | { op: "propose"; intent: PaymentIntent; preview: string }
  | { op: "confirm"; intent: PaymentIntent }
  | { op: "cancel"; intent: PaymentIntent };

export interface PayAdapters {
  /** Persist a new intent in 'pending-approval' state. */
  createIntent: (intent: Omit<PaymentIntent, "id" | "status" | "proposedAt">) => Promise<PaymentIntent>;
  /** Retrieve an intent by id. */
  getIntent: (id: string) => Promise<PaymentIntent | null>;
  /** Mark intent confirmed/cancelled and persist. */
  updateIntent: (id: string, patch: Partial<PaymentIntent>) => Promise<PaymentIntent>;
  /** Actually execute the payment via the chosen provider. */
  execute: (intent: PaymentIntent) => Promise<{ providerRef: string; settled: boolean }>;
}

function previewLine(intent: PaymentIntent): string {
  const amount = `${intent.amount.toLocaleString()} ${intent.currency}`;
  return `Pay ${amount} via ${intent.provider} to ${intent.to} — "${intent.memo}". Reply YES to approve.`;
}

export function createPayHand(adapters: PayAdapters): Hand<PayArgs, PayResult> {
  return {
    name: "pay",
    description:
      "Mobile money + card payments. Two-phase: 'propose' creates a pending intent; " +
      "'confirm' (only after human approval) actually moves money. 'cancel' drops it.",
    permissionTier: "needs-approval",
    inputSchema: {
      op: "One of 'propose', 'confirm', or 'cancel'.",
      provider: "(propose) mpesa | mtn-momo | airtel-money | flutterwave | paystack",
      amount: "(propose) Numeric amount.",
      currency: "(propose) Currency code, e.g. UGX, KES, NGN.",
      to: "(propose) Recipient phone (mobile money) or account reference.",
      memo: "(propose) What this payment is for.",
      tenantId: "(propose) Tenant this payment belongs to.",
      paymentIntentId: "(confirm/cancel) The intent id returned by propose.",
    },

    async execute(args: PayArgs, ctx: HandContext): Promise<HandResult<PayResult>> {
      try {
        if (args.op === "propose") {
          const intent = await adapters.createIntent({
            tenantId: args.tenantId,
            provider: args.provider,
            amount: args.amount,
            currency: args.currency,
            to: args.to,
            memo: args.memo,
          });
          await ctx.audit({
            hand: "pay",
            args,
            result: "queued",
            by: ctx.user.userId,
            notes: `Proposed ${args.amount} ${args.currency} via ${args.provider} → ${args.to}`,
          });
          return {
            ok: true,
            data: { op: "propose", intent, preview: previewLine(intent) },
            message: previewLine(intent),
          };
        }

        if (args.op === "confirm") {
          if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
            const err = `confirm refused: role '${ctx.user.role}' cannot approve payments`;
            await ctx.audit({ hand: "pay", args, result: "denied", by: ctx.user.userId, notes: err });
            return { ok: false, error: err };
          }
          const found = await adapters.getIntent(args.paymentIntentId);
          if (!found) return { ok: false, error: `intent ${args.paymentIntentId} not found` };
          if (found.status !== "pending-approval") {
            return { ok: false, error: `intent is in '${found.status}', cannot confirm` };
          }
          const confirmed = await adapters.updateIntent(args.paymentIntentId, {
            status: "confirmed",
            resolvedAt: new Date().toISOString(),
          });
          const { providerRef, settled } = await adapters.execute(confirmed);
          const finalIntent = await adapters.updateIntent(args.paymentIntentId, {
            status: settled ? "settled" : "failed",
            providerRef,
          });
          await ctx.audit({
            hand: "pay",
            args,
            result: settled ? "approved" : "error",
            by: ctx.user.userId,
            notes: `${settled ? "Settled" : "Failed"} ${finalIntent.amount} ${finalIntent.currency} via ${finalIntent.provider} ref=${providerRef}`,
          });
          return {
            ok: settled,
            data: { op: "confirm", intent: finalIntent },
            message: settled ? `Paid. Ref ${providerRef}.` : `Provider declined. Ref ${providerRef}.`,
          };
        }

        // cancel
        const found = await adapters.getIntent(args.paymentIntentId);
        if (!found) return { ok: false, error: `intent ${args.paymentIntentId} not found` };
        const cancelled = await adapters.updateIntent(args.paymentIntentId, {
          status: "cancelled",
          resolvedAt: new Date().toISOString(),
        });
        await ctx.audit({
          hand: "pay",
          args,
          result: "denied",
          by: ctx.user.userId,
          notes: `Cancelled intent ${args.paymentIntentId}`,
        });
        return { ok: true, data: { op: "cancel", intent: cancelled }, message: "Payment cancelled." };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.audit({ hand: "pay", args, result: "error", by: ctx.user.userId, notes: msg });
        return { ok: false, error: msg };
      }
    },
  };
}
