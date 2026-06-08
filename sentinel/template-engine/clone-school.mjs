#!/usr/bin/env node
/**
 * clone-school.mjs — NEXT Schools OS rebrand engine.
 * Reads the canonical Peak Primary prototype and produces a fully
 * rebranded copy for a new school: name, slug, accent colour, logo, title.
 *
 * Usage:  node sentinel/template-engine/clone-school.mjs <brand-profile.json>
 * Output: prototypes/schools/<slug>/  (a working, branded School OS)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE = path.join(ROOT, 'prototypes', 'schools', 'peak-primary');

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}
function darken(hex, f = 0.45) {
  const { r,g,b } = hexToRgb(hex);
  const d = v => Math.max(0, Math.round(v * (1 - f)));
  return '#' + [d(r),d(g),d(b)].map(v => v.toString(16).padStart(2,'0')).join('').toUpperCase();
}
function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }

function rebrand(content, b) {
  const accent = b.accent.toUpperCase();
  const accentDark = (b.accentDark || darken(b.accent)).toUpperCase();
  const { r,g,b: bl } = hexToRgb(b.accent);
  const accentRGB = `${r},${g},${bl}`;
  return content
    .split('Peak Primary').join(b.displayName)
    .split('PEAK PRIMARY').join(b.displayName.toUpperCase())
    .split('peak-primary').join(b.slug)
    .split('peak-logo').join(b.slug + '-logo')
    .split('#00FC8F').join(accent).split('#00fc8f').join(accent)
    .split('#1B9B6F').join(accentDark).split('#1b9b6f').join(accentDark)
    .split('0,252,143').join(accentRGB)
    .split('0, 252, 143').join(accentRGB);
}

function main() {
  const profilePath = process.argv[2];
  if (!profilePath) { console.error('Usage: node clone-school.mjs <brand-profile.json>'); process.exit(1); }
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  const brand = profile.brand || {};
  brand.displayName = brand.displayName || profile.name;
  brand.slug = brand.slug || slugify(profile.institutionId || profile.name);
  brand.accent = brand.accent || '#00FC8F';
  if (!brand.displayName || !brand.slug) { console.error('Profile needs name + slug.'); process.exit(1); }

  const OUT = path.join(ROOT, 'prototypes', 'schools', brand.slug);
  if (OUT === SOURCE) { console.error('Refusing to overwrite the canonical prototype.'); process.exit(1); }
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });

  const TEXT = new Set(['.html', '.jsx', '.js', '.json', '.css']);
  let files = 0, edits = 0;
  for (const name of fs.readdirSync(SOURCE)) {
    const src = path.join(SOURCE, name);
    if (fs.statSync(src).isDirectory()) continue;
    const ext = path.extname(name).toLowerCase();
    const dst = path.join(OUT, name);
    if (TEXT.has(ext)) {
      const before = fs.readFileSync(src, 'utf8');
      const after = rebrand(before, brand);
      if (after !== before) edits++;
      fs.writeFileSync(dst, after);
    } else {
      fs.copyFileSync(src, dst);
    }
    files++;
  }
  // write a brand manifest so Nia / the OS knows this tenant's identity
  fs.writeFileSync(path.join(OUT, 'brand.json'), JSON.stringify({
    tenantId: brand.slug, displayName: brand.displayName,
    accent: brand.accent.toUpperCase(), accentDark: (brand.accentDark || darken(brand.accent)).toUpperCase(),
    motto: brand.motto || null, clonedFrom: 'peak-primary', clonedAt: new Date().toISOString(),
    source: profile.name || brand.displayName,
  }, null, 2));

  console.log(`Cloned Peak Primary -> ${brand.displayName} (${brand.slug})`);
  console.log(`  ${files} files written, ${edits} rebranded, accent ${brand.accent}`);
  console.log(`  Output: prototypes/schools/${brand.slug}/index.html`);
}
main();
