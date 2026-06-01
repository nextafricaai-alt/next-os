/**
 * The Spawn Hand — Hand #1
 * ------------------------
 * Hudson said: "the agent, basing on the prototype, should also be able to
 *               make the OS of another school in 10 mins."
 *
 * This is that hand. It takes a vertical (school, church, hospital, etc.)
 * plus the answers the agent collected during intake, and spawns a fully
 * configured tenant.
 *
 * What it does, end to end:
 *   1. Load the canonical template for the vertical (e.g. school-template.json).
 *   2. Validate the intake profile has every required field.
 *   3. Call the existing configurator to produce a customized TenantConfig.
 *   4. Persist the tenant row into the `tenants` table.
 *   5. Deploy the customized frontend (subdomain + branding).
 *   6. Wire the tenant's WhatsApp number into Twilio.
 *   7. Activate Sentinel monitoring on the new tenant.
 *   8. Return tenant identifiers + login link.
 *
 * The Spawn Hand is admin-only because creating tenants is a serious action.
 * Once spawned, the tenant lives independently — admins of the new tenant
 * can then drive everything through the Configure Hand and other hands.
 *
 * Steps 4–7 each call adapter functions that can be wired to real services
 * (Supabase, Hostinger, Twilio) without touching this file. That's the
 * "don't affect the agent" property — swap the adapters, the hand is fine.
 */

import { configureTenant } from "../configurator.js";
import type {
  VerticalTemplate,
  TenantProfile,
  TenantConfig,
} from "../configurator.js";
import type { Hand, HandContext, HandResult } from "../hand.js";

/** What the brain passes when it calls the Spawn Hand. */
export interface SpawnArgs {
  /** Which vertical to spawn from. Must match a template directory. */
  vertical: "school" | "church" | "hospital" | "home" | "ngo" | "company" | "organisation";
  /** The intake profile the agent collected via conversation. */
  profile: TenantProfile;
  /** Optional connection details if the tenant already has their own DB. */
  dataSource?: { kind: "postgres" | "supabase" | "mysql" | "sqlite" | "rest-api"; connection: string; notes?: string };
  /** Whose number to wire into WhatsApp for this tenant. E.164 format. */
  whatsappNumber?: string;
  /** Subdomain to deploy to. Defaults to slugified institutionId. */
  subdomain?: string;
}

/** What the Spawn Hand returns. */
export interface SpawnResult {
  tenantId: string;
  slug: string;
  loginUrl: string;
  dashboardUrl: string;
  whatsappWired: boolean;
  monitoringActive: boolean;
  elapsedMs: number;
}

/* -------------------------------------------------------------------------
 * Adapters. These are the seams. Wire them to real services in production;
 * in tests, replace them with stubs. Either way the hand body never changes.
 * ----------------------------------------------------------------------- */

export interface SpawnAdapters {
  /** Load template JSON for a vertical from disk / network. */
  loadTemplate: (vertical: SpawnArgs["vertical"]) => Promise<VerticalTemplate>;
  /** Insert a row into `tenants` and return the new tenant id. */
  persistTenant: (config: TenantConfig) => Promise<{ tenantId: string }>;
  /** Deploy the frontend (subdomain + branding) and return the URLs. */
  deployFrontend: (
    config: TenantConfig,
    subdomain: string
  ) => Promise<{ loginUrl: string; dashboardUrl: string }>;
  /** Register the tenant's WhatsApp number with Twilio. */
  wireWhatsApp: (tenantId: string, number: string) => Promise<{ wired: boolean }>;
  /** Tell Sentinel: start watching this tenant. */
  activateMonitoring: (tenantId: string) => Promise<{ active: boolean }>;
}

/* -------------------------------------------------------------------------
 * The hand itself.
 * ----------------------------------------------------------------------- */

export function createSpawnHand(adapters: SpawnAdapters): Hand<SpawnArgs, SpawnResult> {
  return {
    name: "spawn",
    description:
      "Create a brand-new tenant from a vertical template. Use when an admin " +
      "wants to onboard a new school/church/clinic/etc. and the intake is complete.",
    permissionTier: "admin-only",
    inputSchema: {
      vertical: "Which vertical template to clone (school, church, hospital, ...).",
      profile: "Intake answers: institutionId, name, country, currency, plus vertical-specific fields.",
      dataSource: "Optional. The tenant's own database connection, if they have one.",
      whatsappNumber: "Optional. The tenant's WhatsApp number in E.164 format.",
      subdomain: "Optional. Subdomain to deploy to. Defaults to slugified institutionId.",
    },

    async execute(args: SpawnArgs, ctx: HandContext): Promise<HandResult<SpawnResult>> {
      const t0 = Date.now();

      // --- Permission gate: spawn is admin-only. -----------------------------
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        const err = `spawn refused: user role '${ctx.user.role}' is not admin/owner`;
        await ctx.audit({ hand: "spawn", args, result: "denied", by: ctx.user.userId, notes: err });
        return { ok: false, error: err };
      }

      try {
        // --- 1. Load canonical template for the vertical. --------------------
        const template = await adapters.loadTemplate(args.vertical);

        // --- 2 + 3. Configure (validates required fields, applies overrides). -
        const config = configureTenant(template, args.profile, args.dataSource);

        // --- 4. Persist tenant row. -----------------------------------------
        const { tenantId } = await adapters.persistTenant(config);

        // --- 5. Deploy frontend. --------------------------------------------
        const subdomain = args.subdomain || config.slug;
        const { loginUrl, dashboardUrl } = await adapters.deployFrontend(config, subdomain);

        // --- 6. Wire WhatsApp (best-effort; not fatal if missing). ----------
        let whatsappWired = false;
        if (args.whatsappNumber) {
          const r = await adapters.wireWhatsApp(tenantId, args.whatsappNumber);
          whatsappWired = r.wired;
        }

        // --- 7. Activate Sentinel monitoring. -------------------------------
        const { active: monitoringActive } = await adapters.activateMonitoring(tenantId);

        // --- 8. Done. Audit + return. ---------------------------------------
        const elapsedMs = Date.now() - t0;
        const result: SpawnResult = {
          tenantId,
          slug: config.slug,
          loginUrl,
          dashboardUrl,
          whatsappWired,
          monitoringActive,
          elapsedMs,
        };
        await ctx.audit({
          hand: "spawn",
          args,
          result: "ok",
          by: ctx.user.userId,
          notes: `Spawned ${config.name} (${config.slug}) in ${(elapsedMs / 1000).toFixed(1)}s`,
        });
        return {
          ok: true,
          data: result,
          message:
            `Spawned ${config.name}. Dashboard: ${dashboardUrl}. ` +
            `Whatsapp ${whatsappWired ? "wired" : "not wired"}. ` +
            `Sentinel ${monitoringActive ? "monitoring" : "inactive"}. ` +
            `Took ${(elapsedMs / 1000).toFixed(1)}s.`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.audit({ hand: "spawn", args, result: "error", by: ctx.user.userId, notes: msg });
        return { ok: false, error: msg };
      }
    },
  };
}
