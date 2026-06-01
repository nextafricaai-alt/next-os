/**
 * Tenant configurator
 * -------------------
 * "The school prototype will be in NEXT. It will be like a template for all
 *  schools. Now the agent in NEXT will have to just twitch a few things to
 *  make it compatible with the next school." — Hudson
 *
 * This file is that "twitch." It takes the canonical template (e.g.
 * templates/schools/school-template.json) plus a school-specific profile
 * (e.g. sample-school-profile.json) and produces a customized tenant config
 * ready to insert into the Supabase `tenants` table.
 *
 * It's the bridge between "one master template" and "many live schools."
 */

import type { Vertical, TenantDataSource } from "../shared/src/health-signal.js";

/** What's in a vertical template. Shared shape across schools/hospitals/etc. */
export interface VerticalTemplate {
  templateId: string;
  vertical: Vertical;
  description: string;
  requiredProfileFields: string[];
  kpiDefaults: Record<string, number>;
  thresholds: Record<string, string | number>;
  advisoryTone: {
    style: string;
    decisionModel: string;
    example: string;
  };
  modules: string[];
}

/** What a specific school (or hospital, etc.) brings to the onboarding. */
export interface TenantProfile {
  institutionId: string;
  name: string;
  country: string;
  currency: string;
  /** Anything else specific to this vertical — fees, capacity, donor base, etc. */
  [k: string]: unknown;
}

/** Connection details for the tenant's own database. */
export interface TenantDataSourceInput extends TenantDataSource {}

/** The customized config ready to become a row in `tenants`. */
export interface TenantConfig {
  slug: string;
  name: string;
  vertical: Vertical;
  country?: string;
  currency: string;
  profile: TenantProfile;
  dataSource?: TenantDataSourceInput;
  thresholds: Record<string, string | number>;
  modules: string[];
  advisoryTone: VerticalTemplate["advisoryTone"];
}

export class ConfiguratorError extends Error {}

/**
 * Take a template + a profile + (optionally) a data-source connection and
 * produce a fully-resolved tenant config. The agent calls this every time
 * a new school onboards.
 */
export function configureTenant(
  template: VerticalTemplate,
  profile: TenantProfile,
  dataSource?: TenantDataSourceInput
): TenantConfig {
  // 1. Verify the profile has every field the template requires.
  const missing = template.requiredProfileFields.filter(
    (f) => profile[f] === undefined || profile[f] === null
  );
  if (missing.length) {
    throw new ConfiguratorError(
      `Profile for '${profile.institutionId}' is missing required fields: ${missing.join(", ")}`
    );
  }

  // 2. Resolve thresholds. Profile values override template defaults.
  const thresholds: Record<string, string | number> = { ...template.thresholds };
  for (const key of Object.keys(thresholds)) {
    if (profile[key] !== undefined && (typeof profile[key] === "number" || typeof profile[key] === "string")) {
      thresholds[key] = profile[key] as string | number;
    }
  }

  return {
    slug: profile.institutionId,
    name: profile.name,
    vertical: template.vertical,
    country: profile.country,
    currency: profile.currency,
    profile,
    dataSource,
    thresholds,
    modules: [...template.modules],
    advisoryTone: { ...template.advisoryTone },
  };
}
