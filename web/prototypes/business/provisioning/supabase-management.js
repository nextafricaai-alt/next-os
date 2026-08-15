/*
 * supabase-management.js — thin client for the Supabase Management API
 * (https://api.supabase.com/v1). Used by provision-business.js to create a
 * dedicated Supabase project per business, run schema.sql against it, and
 * fetch its keys — no manual dashboard clicking.
 *
 * Endpoints used (verified against supabase.com/docs/reference/api on
 * 2026-08-14 — re-check if this ever starts 404ing, Supabase's API does
 * evolve):
 *   GET  /v1/organizations                    — list orgs the token can see
 *   POST /v1/projects                         — create a project
 *   GET  /v1/projects                         — list/poll status
 *   GET  /v1/projects/{ref}/api-keys?reveal=true — fetch anon/service_role
 *   POST /v1/projects/{ref}/database/query    — run arbitrary SQL (Beta)
 *
 * Auth: a Personal Access Token (PAT), generated at
 * https://supabase.com/dashboard/account/tokens, passed as
 * `Authorization: Bearer <token>`. PATs carry the same privileges as the
 * account that made them — treat it like a password. This module only ever
 * reads it from an env var (SUPABASE_ACCESS_TOKEN); it is never accepted as
 * a function argument sourced from a CLI flag or logged anywhere.
 */

const API_BASE = 'https://api.supabase.com/v1';

function getToken() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'SUPABASE_ACCESS_TOKEN is not set. Generate a Personal Access Token at ' +
      'https://supabase.com/dashboard/account/tokens and export it as an env var ' +
      '(or set it as a GitHub Actions secret if running via the provision-business workflow). ' +
      'Never paste the token itself into chat or a committed file.'
    );
  }
  return token;
}

async function req(method, path, body) {
  const res = await fetch(API_BASE + path, {
    method,
    headers: Object.assign(
      { 'Authorization': 'Bearer ' + getToken() },
      body ? { 'Content-Type': 'application/json' } : {}
    ),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch (e) { json = { raw: text }; }
  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || text || res.statusText;
    throw new Error('Supabase Management API ' + method + ' ' + path + ' failed (' + res.status + '): ' + msg);
  }
  return json;
}

/** Lists organizations the token's account belongs to: [{id, slug, name}]. */
async function listOrganizations() {
  return req('GET', '/organizations');
}

/**
 * Creates a new project. `orgSlug` must be a paid (Pro/Team/Enterprise)
 * organization if you already have 2 projects on the Free plan anywhere in
 * your account — Supabase caps Free-plan projects at 2 total, org-wide,
 * regardless of how many orgs you spread them across.
 * Returns the created project object (status starts as 'INACTIVE' /
 * 'COMING_UP' — poll with waitUntilActive()).
 */
async function createProject({ name, orgSlug, dbPass, region }) {
  return req('POST', '/projects', {
    name,
    organization_slug: orgSlug,
    db_pass: dbPass,
    region: region || 'us-east-1',
  });
}

/** Polls GET /v1/projects until the given ref reports an active status. */
async function waitUntilActive(ref, { timeoutMs = 5 * 60 * 1000, intervalMs = 5000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const all = await req('GET', '/projects');
    const proj = (all || []).find((p) => p.ref === ref);
    if (proj && (proj.status === 'ACTIVE_HEALTHY' || proj.status === 'ACTIVE_UNHEALTHY')) {
      return proj;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Timed out waiting for project ' + ref + ' to become active (waited ' + Math.round(timeoutMs / 1000) + 's). It may still be provisioning — check the Supabase dashboard.');
}

/** Fetches this project's API keys (anon + service_role), revealed. */
async function getApiKeys(ref) {
  const keys = await req('GET', '/projects/' + ref + '/api-keys?reveal=true');
  const anon = (keys || []).find((k) => k.name === 'anon' || k.type === 'legacy' && k.name === 'anon');
  const serviceRole = (keys || []).find((k) => k.name === 'service_role');
  return {
    anon: (anon && anon.api_key) || null,
    serviceRole: (serviceRole && serviceRole.api_key) || null,
    raw: keys,
  };
}

/**
 * Runs a SQL string against the project's database via the Management API
 * (Beta endpoint) — used to apply schema.sql without needing a direct
 * Postgres connection. Splits on semicolon-newline boundaries is NOT done
 * here; pass the full script, Postgres handles multi-statement bodies fine
 * in one query call for DDL like schema.sql.
 */
async function runQuery(ref, sql) {
  return req('POST', '/projects/' + ref + '/database/query', { query: sql });
}

module.exports = { listOrganizations, createProject, waitUntilActive, getApiKeys, runQuery };
