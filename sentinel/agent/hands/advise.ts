/**
 * The Advise Hand — Hand #5
 * -------------------------
 * Takes a raw anomaly from the Watch Hand and converts it into a polished
 * Advisory — the thing a headteacher or pastor actually reads.
 *
 * This is where the agent's voice matters. Tone is "professional, empathetic,
 * culturally grounded" (the school-template.json says so). Each vertical's
 * template carries its own advisoryTone — the Advise Hand respects that.
 *
 * Crucially: every advisory carries `humanApprovalRequired: true` until
 * trust is earned. The agent advises, never acts unilaterally.
 */

import type { Hand, HandContext, HandResult } from "../hand.js";
import type { Advisory, Vertical } from "../../shared/src/health-signal.js";
import type { Anomaly } from "./watch.js";

export interface AdviseArgs {
  anomaly: Anomaly;
  /** Vertical of the tenant the anomaly belongs to. */
  vertical: Vertical;
  /** Optional override tone (else the template's tone is used). */
  toneStyle?: string;
}

export type AdviseResult = Advisory;

export interface AdviseAdapters {
  /** Persist the advisory so the frontend + WhatsApp bridge can deliver it. */
  persistAdvisory: (advisory: Advisory) => Promise<Advisory>;
}

/* -------------------------------------------------------------------------
 * Templates that translate anomaly KIND → advisory copy. Keep them in
 * English here; the Translate Hand handles localisation at delivery time.
 * ----------------------------------------------------------------------- */

const COPY: Record<
  string,
  {
    title: string;
    message: (e: Record<string, unknown>) => string;
    actions: Array<{ label: string; actionId: string }>;
    type: Advisory["advisoryType"];
  }
> = {
  "financial-leak": {
    title: "Cash flow needs board attention",
    message: (e) =>
      `Expenses are running ahead of revenue by ${(e.gap as number).toLocaleString()} this term. ` +
      `Without action, the gap will compound.`,
    actions: [
      { label: "Generate a fee-collection drive plan", actionId: "fee-drive-plan" },
      { label: "Show me the top 10 outstanding accounts", actionId: "list-outstanding" },
      { label: "Draft a board memo about the gap", actionId: "board-memo" },
    ],
    type: "financial-leak",
  },
  "enrollment-drop": {
    title: "Enrollment under capacity",
    message: (e) =>
      `Active students (${e.activeStudents}) are below capacity threshold (${e.capacityThreshold}). ` +
      `Each empty seat is recurring lost revenue.`,
    actions: [
      { label: "Draft a parent re-engagement WhatsApp", actionId: "parent-reengage" },
      { label: "Show enrollment by class", actionId: "enrollment-by-class" },
    ],
    type: "enrollment-drop",
  },
  "capacity-warning": {
    title: "Approaching full capacity",
    message: (e) =>
      `Occupancy at ${((e.occupancyRate as number) * 100).toFixed(0)}%. Consider triage and overflow plans.`,
    actions: [{ label: "Open triage protocol", actionId: "triage-protocol" }],
    type: "capacity-warning",
  },
  "donor-drought": {
    title: "Runway under three months",
    message: (e) =>
      `Current runway is ${e.runwayMonths} months. Donor outreach should escalate this week.`,
    actions: [
      { label: "Draft a donor update email", actionId: "donor-update-email" },
      { label: "List lapsed donors from last year", actionId: "lapsed-donors" },
    ],
    type: "donor-drought",
  },
  "burn-rate-warning": {
    title: "Burn rate exceeds revenue",
    message: (e) =>
      `Monthly burn (${(e.burnRate as number).toLocaleString()}) exceeds revenue (${(e.revenue as number).toLocaleString()}). ` +
      `Discuss extension or cuts at the next leadership review.`,
    actions: [
      { label: "Draft a cost-reduction proposal", actionId: "cost-reduction" },
      { label: "Show top 5 expense categories", actionId: "top-expenses" },
    ],
    type: "burn-rate-warning",
  },
};

export function createAdviseHand(adapters: AdviseAdapters): Hand<AdviseArgs, AdviseResult> {
  return {
    name: "advise",
    description:
      "Convert an anomaly into a polished, culturally-grounded Advisory. " +
      "Every advisory requires human approval before any action is taken.",
    permissionTier: "autonomous",
    inputSchema: {
      anomaly: "An Anomaly object from the Watch Hand.",
      vertical: "The vertical of the tenant the anomaly belongs to.",
      toneStyle: "Optional. Override the template's advisoryTone.style.",
    },

    async execute(args: AdviseArgs, ctx: HandContext): Promise<HandResult<AdviseResult>> {
      if (!ctx.tenant) {
        return { ok: false, error: "advise hand requires a tenant context" };
      }
      const copy = COPY[args.anomaly.kind];
      if (!copy) {
        return { ok: false, error: `no advisory template for anomaly kind '${args.anomaly.kind}'` };
      }
      const id = `adv_${args.anomaly.tenantId}_${Date.now()}`;
      const advisory: Advisory = {
        id,
        tenantId: args.anomaly.tenantId,
        timestamp: new Date().toISOString(),
        vertical: args.vertical,
        advisoryType: copy.type,
        severity: args.anomaly.severity,
        title: copy.title,
        message: copy.message(args.anomaly.evidence),
        recommendedActions: copy.actions.map((a) => ({
          label: a.label,
          requiresApproval: true as const,
          actionId: a.actionId,
        })),
        evidence: args.anomaly.evidence,
        humanApprovalRequired: true,
      };
      try {
        const saved = await adapters.persistAdvisory(advisory);
        await ctx.audit({
          hand: "advise",
          args,
          result: "ok",
          by: ctx.user.userId,
          notes: `Advisory ${id} created (${copy.type}, ${args.anomaly.severity})`,
        });
        return { ok: true, data: saved, message: `${copy.title} — advisory queued for approval.` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.audit({ hand: "advise", args, result: "error", by: ctx.user.userId, notes: msg });
        return { ok: false, error: msg };
      }
    },
  };
}
