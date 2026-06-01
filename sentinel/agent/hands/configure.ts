/**
 * The Configure Hand — Hand #3
 * ----------------------------
 * After a tenant is spawned, the Configure Hand lets the agent (or an admin
 * via the agent) twitch knobs without redeploying or touching the brain.
 *
 * Examples:
 *   - "Switch their currency to KES because they expanded to Nairobi."
 *   - "Add the 'transport_fees' module to St. Mary's."
 *   - "Update the brand color to forest green for Mbarara Secondary."
 *   - "Change the term-end threshold from 296M to 350M UGX."
 *
 * The hand is permission-gated: only owner/admin roles may use it, and any
 * change that touches money (currency, thresholds, fee categories) must
 * pass through the human-approval gate.
 */

import type { Hand, HandContext, HandResult } from "../hand.js";

export interface ConfigureArgs {
  /** Which knob to change. Brain figures this out from the conversation. */
  field:
    | "name"
    | "brand"
    | "currency"
    | "language"
    | "modules"
    | "thresholds"
    | "advisoryTone"
    | "profile";
  /** The new value. Shape depends on field. */
  value: unknown;
  /** Free-form reason the brain logs to audit so we know WHY. */
  reason?: string;
}

export interface ConfigureResult {
  field: ConfigureArgs["field"];
  before: unknown;
  after: unknown;
}

export interface ConfigureAdapters {
  readTenant: (tenantId: string) => Promise<Record<string, unknown>>;
  writeTenant: (tenantId: string, patch: Record<string, unknown>) => Promise<void>;
}

/** Fields that affect money or trust → must be human-approved. */
const SENSITIVE_FIELDS: ConfigureArgs["field"][] = ["currency", "thresholds", "profile"];

export function createConfigureHand(adapters: ConfigureAdapters): Hand<ConfigureArgs, ConfigureResult> {
  return {
    name: "configure",
    description:
      "Twitch a setting on an existing tenant — brand, language, modules, thresholds. " +
      "Sensitive changes (currency, thresholds, fee profile) require human approval.",
    permissionTier: "needs-approval",
    inputSchema: {
      field: "Which setting to change: name, brand, currency, language, modules, thresholds, advisoryTone, or profile.",
      value: "The new value (type depends on field).",
      reason: "Optional. Why this change is being made — written to the audit log.",
    },

    async execute(args: ConfigureArgs, ctx: HandContext): Promise<HandResult<ConfigureResult>> {
      if (!ctx.tenant) {
        return { ok: false, error: "configure hand requires a tenant context" };
      }
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        const err = `configure refused: role '${ctx.user.role}' lacks permission`;
        await ctx.audit({ hand: "configure", args, result: "denied", by: ctx.user.userId, notes: err });
        return { ok: false, error: err };
      }

      try {
        const current = await adapters.readTenant(ctx.tenant.tenantId);
        const before = current[args.field];
        await adapters.writeTenant(ctx.tenant.tenantId, { [args.field]: args.value });

        const sensitive = SENSITIVE_FIELDS.includes(args.field);
        await ctx.audit({
          hand: "configure",
          args,
          result: sensitive ? "approved" : "ok",
          by: ctx.user.userId,
          notes: `Changed ${args.field}${args.reason ? ` — ${args.reason}` : ""}`,
        });

        return {
          ok: true,
          data: { field: args.field, before, after: args.value },
          message: `Updated ${args.field} on ${ctx.tenant.name}.`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.audit({ hand: "configure", args, result: "error", by: ctx.user.userId, notes: msg });
        return { ok: false, error: msg };
      }
    },
  };
}
