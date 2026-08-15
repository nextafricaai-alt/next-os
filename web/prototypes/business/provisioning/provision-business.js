#!/usr/bin/env node
/*
 * provision-business.js — NEXT Business OS, fully automated provisioning.
 *
 * Given a business's onboarding config, this does everything the README
 * used to ask a human to click through by hand:
 *   1. Create a dedicated Supabase project for the business.
 *   2. Wait for it to come online.
 *   3. Run schema.sql against it.
 *   4. Invite the owner by email — Supabase emails them a secure link to
 *      set their own password. This script never generates, transmits, or
 *      stores a real password for anyone.
 *   5. Stamp the app template with the business's config + the new
 *      project's real URL/anon key (via stamp-template.js).
 *
 * What this still does NOT do: deploy the stamped output anywhere. That's
 * a separate, deliberately un-automated step — see the README.
 *
 * SECURITY NOTE: this repo is public. That shaped two decisions here —
 * (1) the owner never gets a password we generated (invite-by-email instead,
 * so there's nothing secret to leak via a log or an artifact), and (2) the
 * one-time database password used to create the project lives only in this
 * process's memory for the single API call that needs it, then is discarded
 * — never printed, never written to disk. If direct Postgres access is ever
 * needed later, reset the DB password from the Supabase dashboard.
 *
 * Requires SUPABASE_ACCESS_TOKEN in the environment (a Personal Access
 * Token from https://supabase.com/dashboard/account/tokens) and, in
 * practice, a paid (Pro/Team) Supabase organization — the Free plan caps
 * at 2 projects total across your whole account, which real multi-business
 * provisioning will blow through fast. Never pass the token as a CLI flag;
 * it's read from the environment only, so it never lands in shell history,
 * process listings, or a workflow log.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node provision-business.js \
 *     --config path/to/business-config.json \
 *     --out path/to/deployed/<business-slug> \
 *     [--org-slug your-org-slug] [--region us-east-1]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const sb = require('./supabase-management');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

function slugify(s) {
  return String(s || 'business')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'business';
}

function randomPassword(len) {
  // Printable, shell/URL-safe, no ambiguous-looking chars.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%^&*-_';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.config || !args.out) {
    console.error('Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node provision-business.js --config <business-config.json> --out <output-dir> [--org-slug SLUG] [--region us-east-1]');
    process.exit(1);
  }

  const configPath = path.resolve(args.config);
  const outDir = path.resolve(args.out);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const region = args.region || 'us-east-1';

  console.log('═'.repeat(70));
  console.log('Provisioning "' + config.businessName + '" — full automation');
  console.log('═'.repeat(70));

  // ── 1. Resolve which Supabase organization to create the project in ──
  let orgSlug = args['org-slug'];
  if (!orgSlug) {
    console.log('\nNo --org-slug given — looking up your organizations...');
    const orgs = await sb.listOrganizations();
    if (!orgs || orgs.length === 0) {
      throw new Error('This token has no organizations. Create one at https://supabase.com/dashboard/org and pass --org-slug.');
    }
    if (orgs.length > 1) {
      throw new Error(
        'This token belongs to multiple organizations — pass --org-slug to pick one:\n' +
        orgs.map((o) => '  ' + o.slug + '  (' + o.name + ')').join('\n')
      );
    }
    orgSlug = orgs[0].slug;
    console.log('Using organization: ' + orgSlug + ' (' + orgs[0].name + ')');
  }

  // ── 2. Create the project ──
  const projectName = slugify(config.businessName);
  const dbPass = randomPassword(24);
  console.log('\nCreating Supabase project "' + projectName + '" in ' + region + '...');
  const created = await sb.createProject({ name: projectName, orgSlug, dbPass, region });
  const ref = created.ref;
  console.log('Project created: ref=' + ref + ' (status: ' + created.status + ')');

  // ── 3. Wait for it to come online ──
  console.log('Waiting for the project to become active (this usually takes 1-2 minutes)...');
  const active = await sb.waitUntilActive(ref);
  console.log('Project is active: ' + active.status);

  const projectUrl = 'https://' + ref + '.supabase.co';

  // ── 4. Run schema.sql ──
  const schemaPath = path.join(__dirname, '..', 'template', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  console.log('\nRunning schema.sql against the new project...');
  await sb.runQuery(ref, schemaSql);
  console.log('Schema applied.');

  // ── 5. Fetch API keys ──
  console.log('\nFetching API keys...');
  const keys = await sb.getApiKeys(ref);
  if (!keys.anon) throw new Error('Could not retrieve an anon key for the new project — check it manually at ' + projectUrl);
  if (!keys.serviceRole) throw new Error('Could not retrieve a service_role key for the new project — cannot create the owner login. Check it manually at ' + projectUrl);

  // ── 6. Invite the owner — Supabase emails them a link to set their own
  // password. Nothing password-shaped is generated or handled by this
  // script at all, so there's nothing sensitive to leak.
  const ownerEmail = config.owner && config.owner.email;
  if (!ownerEmail) throw new Error('config.owner.email is missing — cannot invite an owner.');
  console.log('\nInviting owner (' + ownerEmail + ') by email...');
  const inviteRes = await fetch(projectUrl + '/auth/v1/invite', {
    method: 'POST',
    headers: {
      'apikey': keys.serviceRole,
      'Authorization': 'Bearer ' + keys.serviceRole,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: ownerEmail,
      data: { name: (config.owner && config.owner.name) || '' },
    }),
  });
  const inviteBody = await inviteRes.json().catch(() => ({}));
  if (!inviteRes.ok) {
    throw new Error('Failed to invite the owner (' + inviteRes.status + '): ' + (inviteBody.msg || inviteBody.message || JSON.stringify(inviteBody)));
  }
  console.log('Invite sent — Supabase\'s built-in email service is rate-limited and can land in spam; tell the owner to check there if it doesn\'t arrive.');

  // ── 7. Stamp the template with the real credentials ──
  console.log('\nStamping the app template with this project\'s credentials...');
  execFileSync(process.execPath, [
    path.join(__dirname, 'stamp-template.js'),
    '--config', configPath,
    '--out', outDir,
    '--supabase-url', projectUrl,
    '--supabase-anon', keys.anon,
  ], { stdio: 'inherit' });

  console.log('\n' + '═'.repeat(70));
  console.log('Done. "' + config.businessName + '" is provisioned and stamped.');
  console.log('═'.repeat(70));
  console.log('Stamped app:      ' + outDir);
  console.log('Supabase project: ' + projectUrl + '  (dashboard: https://supabase.com/dashboard/project/' + ref + ')');
  console.log('Owner:            ' + ownerEmail + ' — invited by email, will set their own password.');
  console.log('\nStill manual: deploying ' + outDir + ' as a live site (see the README).');
}

main().catch((err) => {
  console.error('\n✗ Provisioning failed: ' + err.message);
  process.exit(1);
});
