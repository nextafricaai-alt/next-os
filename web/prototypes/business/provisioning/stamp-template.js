#!/usr/bin/env node
/*
 * stamp-template.js — NEXT Business OS provisioning step 1 of 2.
 *
 * Takes a BUSINESS_CONFIG JSON (the output of the onboarding wizard's
 * buildBusinessConfig(), see web/prototypes/business/onboarding/) and the
 * shared CharisOS template (web/prototypes/business/template/, an
 * unmodified copy of charisos/), and produces a standalone, business-specific
 * deployable copy: branding, currency, pipeline stages, per-stage QC
 * checklists, nav/header/button vocabulary, and Charis's own seed data all
 * stamped/stripped appropriately. See stamp-template.md in this folder for
 * the full explanation of what gets touched and why.
 *
 * This script never modifies the template in place — it only reads it and
 * writes a fresh copy to --out.
 *
 * Usage:
 *   node stamp-template.js --config path/to/business-config.json --out path/to/output-dir \
 *     [--supabase-url https://xxxx.supabase.co] [--supabase-anon sb_publishable_xxx]
 *
 * If --supabase-url/--supabase-anon are omitted, supabase.js is stamped with
 * clearly-marked placeholders and the script prints a loud warning — the
 * output is NOT safe to deploy until real per-business Supabase credentials
 * are filled in (see provisioning step 2, the semi-manual Supabase setup
 * flow, since there's no confirmed API for provisioning Supabase projects
 * automatically).
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── CLI ARGS ─────────────────────────────────────────────────────────────
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

const args = parseArgs(process.argv.slice(2));

if (!args.config || !args.out) {
  console.error('Usage: node stamp-template.js --config <business-config.json> --out <output-dir> [--supabase-url URL] [--supabase-anon KEY]');
  process.exit(1);
}

const REPO_ROOT    = path.resolve(__dirname, '..', '..', '..', '..');
const TEMPLATE_DIR = path.join(REPO_ROOT, 'web', 'prototypes', 'business', 'template');
const PRESETS_PATH = path.join(REPO_ROOT, 'web', 'prototypes', 'business', 'onboarding', 'business-presets.js');
const CONFIG_PATH  = path.resolve(args.config);
const OUT_DIR       = path.resolve(args.out);

if (!fs.existsSync(TEMPLATE_DIR)) {
  console.error('Template not found at ' + TEMPLATE_DIR);
  process.exit(1);
}
if (!fs.existsSync(CONFIG_PATH)) {
  console.error('Config not found at ' + CONFIG_PATH);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// Load business-presets.js in a small sandbox to get window.BUSINESS_TYPE_PRESETS
// without needing a browser or a duplicate copy of the preset data.
const presetsSrc = fs.readFileSync(PRESETS_PATH, 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(presetsSrc, sandbox, { filename: PRESETS_PATH });
const PRESETS = sandbox.window.BUSINESS_TYPE_PRESETS;
const preset = PRESETS[config.businessType] || PRESETS.custom;

console.log('Stamping "' + config.businessName + '" (' + preset.label + ') → ' + OUT_DIR);

// ── 1. COPY TEMPLATE DIR (unmodified) → OUT_DIR ────────────────────────────
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (entry === '.DS_Store') continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}
if (fs.existsSync(OUT_DIR)) {
  console.error('Output directory already exists: ' + OUT_DIR + ' — refusing to overwrite. Remove it first or pick a new --out.');
  process.exit(1);
}
copyRecursive(TEMPLATE_DIR, OUT_DIR);

// ── 2. STAMP index.html ─────────────────────────────────────────────────
const indexPath = path.join(OUT_DIR, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html.length;
let stepsApplied = [];

function mustReplace(label, pattern, replacement) {
  if (!pattern.test(html)) {
    throw new Error('stamp-template: pattern for "' + label + '" not found — template has drifted, update stamp-template.js. Pattern: ' + pattern);
  }
  html = html.replace(pattern, replacement);
  stepsApplied.push(label);
}

// Escapes a string for safe embedding inside a single-quoted JS string literal.
function jsStr(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n');
}

// -- 2a. <title> and PWA meta title --------------------------------------
mustReplace('document title',
  /<title>CharisOS — Charis Creations Limited<\/title>/,
  '<title>' + escapeHtmlAttr(config.businessName) + '</title>');
mustReplace('apple-mobile-web-app-title',
  /<meta name="apple-mobile-web-app-title" content="CharisOS"\/>/,
  '<meta name="apple-mobile-web-app-title" content="' + escapeHtmlAttr(config.businessName) + '"/>');

function escapeHtmlAttr(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// -- 2a-ii. Login screen — static HTML rendered before any JS runs, so it
// does NOT read from COMPANY_SETTINGS at all (that object doesn't exist yet
// at this point in page load). Charis's real logo, "you@chariscreations.com"
// placeholder, and tagline are hardcoded directly into the markup and need
// their own separate stamping pass. This is the very first thing a business's
// team sees, so it matters more than most "deep microcopy".
const loginLogoPattern = /<div style="text-align:center;margin-bottom:24px;"><img src="data:image\/jpeg;base64,[^"]*"[^>]*\/>\s*<\/div>/;
if (config.logoDataUrl) {
  mustReplace('login screen logo (uploaded)',
    loginLogoPattern,
    '<div style="text-align:center;margin-bottom:24px;"><img src="' + config.logoDataUrl + '" style="height:90px;width:auto;border-radius:8px;" alt="' + escapeHtmlAttr(config.businessName) + '"/></div>');
} else {
  const initial = escapeHtmlAttr((config.businessName || '?').trim().charAt(0).toUpperCase() || '?');
  mustReplace('login screen logo (generated initial, no upload)',
    loginLogoPattern,
    '<div style="text-align:center;margin-bottom:24px;"><div style="display:inline-flex;align-items:center;justify-content:center;width:90px;height:90px;border-radius:16px;background:' + escapeHtmlAttr(config.brandColor) + ';color:#fff;font-size:36px;font-weight:800;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">' + initial + '</div></div>');
}
mustReplace('login email placeholder',
  /placeholder="you@chariscreations\.com"/,
  'placeholder="you@' + escapeHtmlAttr((config.businessName || 'yourbusiness').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'yourbusiness') + '.com"');
mustReplace('login screen tagline',
  /<div style="text-align:center;margin-top:16px;font-size:11px;color:var\(--dim\);">Bringing Image to Life<\/div>/,
  '<div style="text-align:center;margin-top:16px;font-size:11px;color:var(--dim);">' + escapeHtmlAttr(config.tagline) + '</div>');

// -- 2b. COMPANY_SETTINGS — brand identity, contact info, currency ------
// Charis's real banking/legal/momo details must NOT leak into another
// business's copy — those fields go blank rather than guessed.
//
// IMPORTANT: field names here (email, phone, currency, …) are common enough
// that they also appear on unrelated objects elsewhere in the file (team
// member records, retainer contract defaults, etc.) with the SAME literal
// values Charis happens to use. A plain html.replace() would silently hit
// whichever occurrence comes FIRST in the file, which is not necessarily
// COMPANY_SETTINGS — so every field replacement below is scoped to just the
// extracted COMPANY_SETTINGS block, never to the full file.
const companyBlockPattern = /var COMPANY_SETTINGS = \{[\s\S]*?\n\};/;
const companyBlockMatch = html.match(companyBlockPattern);
if (!companyBlockMatch) {
  throw new Error('stamp-template: COMPANY_SETTINGS block not found — template has drifted, update stamp-template.js.');
}
let companyBlock = companyBlockMatch[0];

function replaceInBlock(label, pattern, replacement) {
  if (!pattern.test(companyBlock)) {
    throw new Error('stamp-template: pattern for "' + label + '" not found inside COMPANY_SETTINGS — template has drifted. Pattern: ' + pattern);
  }
  companyBlock = companyBlock.replace(pattern, replacement);
  stepsApplied.push('COMPANY_SETTINGS.' + label);
}

replaceInBlock('name', /name:\s*'Charis Creations Limited',/, "name:       '" + jsStr(config.businessName) + "',");
replaceInBlock('tagline', /tagline:\s*'Bringing Image to Life',/, "tagline:    '" + jsStr(config.tagline) + "',");
replaceInBlock('email', /email:\s*'chariscreationsltd@gmail\.com',/, "email:      '" + jsStr(config.owner.email) + "',");
replaceInBlock('phone', /phone:\s*'\+256 706 028 899',/, "phone:      '" + jsStr(config.owner.phone) + "',");
replaceInBlock('website', /website:\s*'chariscreationsltd\.com',/, "website:    '',");
replaceInBlock('address', /address:\s*'Block 103\/Plot 801, Mungu Valley Road, Namugongo Sonde',/, "address:    '',");
replaceInBlock('currency', /currency:\s*'UGX',/, "currency:   '" + jsStr(config.currency) + "',");
replaceInBlock('brandColor', /brandColor:\s*'#E86418',/, "brandColor: '" + jsStr(config.brandColor) + "',");
replaceInBlock('momoCode', /momoCode:\s*'060215',/, "momoCode:      '',");
replaceInBlock('airtelCode', /airtelCode:\s*'1320567',/, "airtelCode:    '',");
replaceInBlock('flexiPayCode', /flexiPayCode:\s*'267071',/, "flexiPayCode:  '',");
replaceInBlock('equityAccount', /equityAccount:\s*'1025203511681',/, "equityAccount: '',");
replaceInBlock('quoteTagline', /quoteTagline:\s*'Photography \\u00b7 Videography \\u00b7 Post-Production',/, "quoteTagline:    '" + jsStr(config.tagline) + "',");
replaceInBlock('tin', /tin:\s*'1015023475',/, "tin:             '',");
replaceInBlock('ursb', /ursb:\s*'80020001561524',/, "ursb:            '',");
replaceInBlock('postalAddress', /postalAddress:\s*'P\.O\. Box 151380, Mukono',/, "postalAddress:   '',");
replaceInBlock('bankName', /bankName:\s*'Equity Bank Uganda',/, "bankName:        '',");
replaceInBlock('bankBranch', /bankBranch:\s*'Ntinda Branch',/, "bankBranch:      '',");
replaceInBlock('bankAccountName', /bankAccountName:\s*'Charis Creations Limited',/, "bankAccountName: '',");
// logoUrl / logoUrlWhite — long base64 blobs, matched by their key prefix only
// (the value itself is far too large to put in a fixed regex literal).
replaceInBlock('logoUrl', /logoUrl:\s*'data:image\/[a-z]+;base64,[^']*',/,
  "logoUrl:         '" + jsStr(config.logoDataUrl || '') + "',");
replaceInBlock('logoUrlWhite', /logoUrlWhite:\s*'data:image\/[a-z]+;base64,[^']*',/,
  "logoUrlWhite:    '',");
// annualSubscriptions — Charis's real recurring costs, not this business's.
replaceInBlock('annualSubscriptions', /annualSubscriptions:\s*\[[\s\S]*?\],\n(\s*serviceLibrary)/,
  'annualSubscriptions: [],\n$1');

// Splice the modified block back into the full document exactly once.
html = html.replace(companyBlockPattern, function () { return companyBlock; });

// CHARIS_LOGO_B64 — separate embedded logo used only for invoice PDF generation.
html = html.replace(/var CHARIS_LOGO_B64 = 'data:image\/[a-z]+;base64,[^']*';/,
  "var CHARIS_LOGO_B64 = '" + jsStr(config.logoDataUrl || '') + "';");
stepsApplied.push('CHARIS_LOGO_B64');

// -- 2c. Seed/fallback data that must never leak Charis's real operations -
// TEAM/PROJECTS/CLIENTS/etc are already empty at declaration in the template
// (populated at runtime from Supabase) — only the INIT_*/DEFAULT_* fallback
// seed constants (used when a brand-new Supabase project has zero rows) carry
// Charis's actual crew, gear and service-menu. Always emptied, regardless of
// business type — this is Charis's specific operational data, not generic
// demo content.
mustReplace('INIT_TEAM seed',
  /var INIT_TEAM = \[[\s\S]*?\n\];/,
  'var INIT_TEAM = [];');
mustReplace('INIT_EQUIPMENT seed',
  /var INIT_EQUIPMENT = \[[\s\S]*?\n\];/,
  'var INIT_EQUIPMENT = [];');
mustReplace('INIT_BULK_EQUIPMENT seed',
  /var INIT_BULK_EQUIPMENT = \[[\s\S]*?\n\];/,
  'var INIT_BULK_EQUIPMENT = [];');
mustReplace('DEFAULT_SERVICE_LIBRARY seed',
  /var DEFAULT_SERVICE_LIBRARY = \[[\s\S]*?\n\];/,
  'var DEFAULT_SERVICE_LIBRARY = [];');

// -- 2d. Pipeline stages ---------------------------------------------------
// Use the business's OWN pipelineStages from the config — the wizard's
// Step 5 lets a business add/rename/remove stages from the preset default,
// and that customization (not the raw preset) is what must ship. Only fall
// back to the preset's stages if the config is missing them entirely.
// STAGES drives everything downstream via the STAGE_FIRST/LAST/etc anchors
// added at the top of the file — stamping this one array is enough for the
// entire pipeline (kanban columns, deadline logic, "active" filters, etc.)
// to work for this business's own stage list.
const finalStages = (config.pipelineStages && config.pipelineStages.length) ? config.pipelineStages : preset.pipelineStages;
const stageLabelsArr = finalStages.map(function (s) { return "'" + jsStr(s.label) + "'"; }).join(',');
mustReplace('STAGES array',
  /var STAGES = \[[^\]]*\];/,
  'var STAGES = [' + stageLabelsArr + '];');
// DEFAULT_STAGES — used by a Settings "reset pipeline" affordance; stamped
// to match so "reset" gives this business its own stages back, not Charis's.
mustReplace('DEFAULT_STAGES array',
  /var DEFAULT_STAGES = \[[\s\S]*?\n\];/,
  'var DEFAULT_STAGES = [' + stageLabelsArr + '];');

// -- 2e. QC_TEMPLATES (per-stage checklists) -------------------------------
// Photography keeps CharisOS's own native, richer, event-type-aware
// QC_TEMPLATES untouched (preset.qcTemplates is null for photography by
// design). Every other business type gets a generated one, re-keyed to
// follow the business's own (possibly renamed) stage LABELS by matching on
// each stage's stable `key` against the preset's original stage list —
// a stage the wizard's editor renamed keeps its checklist; a stage the
// business added from scratch (no matching preset key) simply gets none,
// which CharisOS already handles gracefully (an empty checklist).
if (preset.qcTemplates) {
  const presetKeyToLabel = {};
  (preset.pipelineStages || []).forEach(function (s) { presetKeyToLabel[s.key] = s.label; });
  const rekeyedQC = {};
  finalStages.forEach(function (s) {
    const origLabel = presetKeyToLabel[s.key];
    if (origLabel && preset.qcTemplates[origLabel]) {
      rekeyedQC[s.label] = preset.qcTemplates[origLabel];
    }
  });
  const qcJson = JSON.stringify(rekeyedQC, null, 2);
  mustReplace('QC_TEMPLATES object',
    /var QC_TEMPLATES = \{[\s\S]*?\n\};/,
    'var QC_TEMPLATES = ' + qcJson + ';');
}

// -- 2f. DEFAULT_CREW_ROLES — photography-specific role list --------------
if (config.businessType !== 'photography') {
  const teamMemberTerm = (config.vocabulary && config.vocabulary.teamMember) || preset.vocabulary.teamMember;
  mustReplace('DEFAULT_CREW_ROLES array',
    /var DEFAULT_CREW_ROLES = \[[\s\S]*?\n\];/,
    "var DEFAULT_CREW_ROLES = [\n  'Owner','Manager','" + jsStr(teamMemberTerm) + "','Sales','Operations','Finance'\n];");
}

// -- 2g. Vocabulary — nav, page headers, primary buttons, empty states ----
// Deliberately scoped to the highest-visibility UI surfaces (see
// business-presets.js header comment) rather than every one of the ~2,000
// raw occurrences of these words in the codebase, most of which are
// internal identifiers (db.projects, clientId, …) that must never change.
// config.vocabulary is preset.vocabulary merged with the wizard's Step 6
// overrides (see buildBusinessConfig in business-presets.js) — always prefer
// it over the raw preset so a business's own word choices actually ship.
const V = Object.assign({}, preset.vocabulary, config.vocabulary || {});
const teamMembers = V.teamMember.replace(/y$/, 'ie') + 's'; // naive pluraliser; every preset value is regular

const vocabReplacements = [
  // Desktop main nav
  [/\{id:'projects', {2}icon:'📋', label:'Projects'\},/, "{id:'projects',  icon:'📋', label:'" + jsStr(V.projects) + "'},"],
  [/\{id:'retainers', icon:'🔁', label:'Retainers'\},/, "{id:'retainers', icon:'🔁', label:'" + jsStr(V.retainers) + "'},"],
  [/\{id:'clients', {3}icon:'👥', label:'Clients'\},/, "{id:'clients',   icon:'👥', label:'" + jsStr(V.clients) + "'},"],
  [/\{id:'team', {6}icon:'🤝', label:'Team'\},/, "{id:'team',      icon:'🤝', label:'" + jsStr(teamMembers) + "'},"],
  [/\{id:'equipment', icon:'📷', label:'Equipment'\},/, "{id:'equipment', icon:'📷', label:'" + jsStr(V.equipment) + "'},"],
  // Mobile bottom nav (owner variant only — "Jobs")
  [/\{id:'projects',icon:'📋',label:'Jobs'\},/, "{id:'projects',icon:'📋',label:'" + jsStr(V.projects) + "'},"],
  // Page headers (topbars)
  [/font-size:19px;font-weight:800;color:#f1f5f9;">Team Management</, 'font-size:19px;font-weight:800;color:#f1f5f9;">' + jsStr(teamMembers) + ' Management<'],
  [/font-size:19px;font-weight:800;color:#f1f5f9;">Projects</, 'font-size:19px;font-weight:800;color:#f1f5f9;">' + jsStr(V.projects) + '<'],
  [/font-size:19px;font-weight:800;color:#f1f5f9;">Clients</, 'font-size:19px;font-weight:800;color:#f1f5f9;">' + jsStr(V.clients) + '<'],
  [/font-size:19px;font-weight:800;color:#f1f5f9;">Equipment</, 'font-size:19px;font-weight:800;color:#f1f5f9;">' + jsStr(V.equipment) + '<'],
  [/font-size:19px;font-weight:800;color:#f1f5f9;">🔁 Retainer Workflow</, 'font-size:19px;font-weight:800;color:#f1f5f9;">🔁 ' + jsStr(V.retainer) + ' Workflow<'],
  // Primary "+ Add X" / "Add New X" buttons and modal headers
  [/data-action="addMember">\+ Add Team Member</, 'data-action="addMember">+ Add ' + jsStr(V.teamMember) + '<'],
  [/data-action="addEditRetainerTeam"[^>]*>\+ Add Team Member</, function (m) { return m.replace('+ Add Team Member', '+ Add ' + jsStr(V.teamMember)); }],
  [/>Add New Team Member</, '>Add New ' + jsStr(V.teamMember) + '<'],
  [/data-action="addClient">\+ Add Client</, 'data-action="addClient">+ Add ' + jsStr(V.client) + '<'],
  [/data-action="addRetainer"[^>]*>\+ Add Client</, function (m) { return m.replace('+ Add Client', '+ Add ' + jsStr(V.client)); }],
  [/'Add New Client'/, "'Add New " + jsStr(V.client) + "'"],
  [/'Edit Client — '\+c\.name/, "'Edit " + jsStr(V.client) + " — '+c.name"],
  [/data-action="addEquip">\+ Add Equipment</, 'data-action="addEquip">+ Add ' + jsStr(V.equipmentSingular) + '<'],
  [/Click <strong style="color:'\+ORANGE\+'\;">\+ Add Equipment<\/strong> to build your inventory\./, "Click <strong style=\"color:'+ORANGE+'\;\">+ Add " + jsStr(V.equipmentSingular) + "</strong> to build your inventory."],
  [/Click <strong style="color:'\+ORANGE\+'\;">\+ Add Equipment<\/strong> to start\./, "Click <strong style=\"color:'+ORANGE+'\;\">+ Add " + jsStr(V.equipmentSingular) + "</strong> to start."],
  [/>Add New Retainer Client</, '>Add New Retainer ' + jsStr(V.client) + '<'],
  [/>✓ Add Retainer Client</, '>✓ Add Retainer ' + jsStr(V.client) + '<'],
  // Empty states
  [/Click <strong style="color:'\+ORANGE\+'\;">\+ Add Client<\/strong> to start\./, "Click <strong style=\"color:'+ORANGE+'\;\">+ Add " + jsStr(V.client) + "</strong> to start."],
  [/'No clients yet\./, "'No " + jsStr(V.clients.toLowerCase()) + " yet."],
  [/'No clients on record\./, "'No " + jsStr(V.clients.toLowerCase()) + " on record."],
  [/'No gear added yet\./, "'No " + jsStr(V.equipment.toLowerCase()) + " added yet."],
  [/>No equipment added yet\.</, '>No ' + jsStr(V.equipment.toLowerCase()) + ' added yet.<'],
  [/:'Add Equipment'\)\+'<\/div>'/, ":'Add " + jsStr(V.equipmentSingular) + "')+'</div>'"],
  // Login-screen / sidebar app-name chip (was literally "CharisOS")
  [/font-size:13px;font-weight:800;color:#f1f5f9;">CharisOS<\/div><div style="font-size:10px;color:var\(--muted\);">Charis Creations</, 'font-size:13px;font-weight:800;color:#f1f5f9;">' + escapeHtmlAttr(config.businessName) + '</div><div style="font-size:10px;color:var(--muted);">' + escapeHtmlAttr(preset.label) + '</'],
];

for (const [pattern, replacement] of vocabReplacements) {
  if (pattern.test(html)) {
    html = typeof replacement === 'function' ? html.replace(pattern, replacement) : html.replace(pattern, replacement);
    stepsApplied.push('vocab: ' + pattern);
  } else {
    console.warn('  (skipped — pattern not found, template may have drifted): ' + pattern);
  }
}

const afterLen = html.length;
console.log('Applied ' + stepsApplied.length + ' stamping steps (' + before + ' → ' + afterLen + ' chars).');

fs.writeFileSync(indexPath, html, 'utf8');

// ── 3. STAMP supabase.js ───────────────────────────────────────────────
const supabasePath = path.join(OUT_DIR, 'supabase.js');
let supabaseJs = fs.readFileSync(supabasePath, 'utf8');
const suppliedUrl  = args['supabase-url'];
const suppliedAnon = args['supabase-anon'];
if (suppliedUrl && suppliedAnon) {
  supabaseJs = supabaseJs
    .replace(/var SUPABASE_URL {2}= '[^']*';/, "var SUPABASE_URL  = '" + jsStr(suppliedUrl) + "';")
    .replace(/var SUPABASE_ANON = '[^']*';/, "var SUPABASE_ANON = '" + jsStr(suppliedAnon) + "';")
    .replace(/storageKey: 'charisOS_auth',/, "storageKey: '" + jsStr(config.businessType) + '_' + jsStr((config.businessName || 'biz').toLowerCase().replace(/[^a-z0-9]+/g, '_')) + "_auth',");
  console.log('supabase.js stamped with the supplied project credentials.');
} else {
  supabaseJs = supabaseJs
    .replace(/var SUPABASE_URL {2}= '[^']*';/, "var SUPABASE_URL  = 'REPLACE_ME_SUPABASE_PROJECT_URL';")
    .replace(/var SUPABASE_ANON = '[^']*';/, "var SUPABASE_ANON = 'REPLACE_ME_SUPABASE_ANON_KEY';");
  console.warn('\n⚠️  No --supabase-url/--supabase-anon supplied. supabase.js has been left with');
  console.warn('    REPLACE_ME placeholders — this copy will NOT run until a real, dedicated');
  console.warn('    Supabase project is created for this business and its URL/anon key are');
  console.warn('    filled in. Never point a new business at Charis\'s own Supabase project.\n');
}
fs.writeFileSync(supabasePath, supabaseJs, 'utf8');

// ── 4. Write the config alongside the output for reference/audit ─────────
fs.writeFileSync(path.join(OUT_DIR, 'business-config.json'), JSON.stringify(config, null, 2), 'utf8');

console.log('\nDone. Stamped copy written to: ' + OUT_DIR);
console.log('Next step: provision a dedicated Supabase project for this business (see');
console.log('web/prototypes/business/provisioning/README.md) and re-run with --supabase-url/--supabase-anon,');
console.log('or edit supabase.js directly, then run schema.sql against that project.');
