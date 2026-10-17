#!/usr/bin/env node
/**
 * build-precompiled.js
 * ─────────────────────────────────────────────────────────────────────────
 * Precompiles index.html's inline <script type="text/babel"> JSX blocks
 * into plain JS at build time, producing index.built.html.
 *
 * WHY THIS EXISTS: index.html ships React 18 + Babel-standalone as CDN
 * globals and runs Babel's JSX transform IN THE BROWSER, on every visit.
 * That's ~943KB of JSX being parsed and transformed live, plus a 3.1MB
 * Babel-standalone library to do it — on a fast desktop that's ~3.3s of
 * blocking main-thread work; on a real phone (especially under iOS Low
 * Power Mode, which throttles the CPU) it can run long enough for Safari's
 * watchdog to kill the page, which is exactly what was reported as
 * "stuck loading, then a grey screen" on iOS.
 *
 * This script runs that SAME Babel transform once, here, and writes the
 * already-compiled JS back into plain <script type="text/javascript">
 * blocks — same execution model (classic scripts, not ES modules, so all
 * the existing window.X cross-block sharing keeps working unchanged),
 * just with the expensive part done once instead of on every visit. The
 * Babel-standalone <script> tag is dropped from the output since nothing
 * needs it anymore.
 *
 * USAGE: run this after every edit to index.html, before deploying —
 *   node build-precompiled.cjs
 * It always reads index.html fresh and always overwrites index.built.html,
 * so the two can never silently drift apart the way index.html and the
 * old dist/index-vite.html did (that mismatch is what caused the outage
 * this script exists to prevent from recurring).
 */
'use strict';
global.self = global;
const Babel = require('../../../vendor/babel.min.js');
const fs = require('fs');
const path = require('path');

const crypto = require('crypto');

const SRC = path.join(__dirname, 'index.html');
const OUT = path.join(__dirname, 'index.built.html');
// External <script type="text/babel" src="..."> files are compiled too
// (audit B1). Before, they were relabelled text/javascript and shipped as
// raw JSX, so the browser threw "Unexpected token '<'" / "Cannot use import
// statement" and those screens never loaded. Compiled copies go here:
const COMPILED_DIR = path.join(__dirname, 'compiled');
const URL_PREFIX = '/prototypes/schools/peak-primary/';

// Babel's JSX transform for one source; import lines for the React globals
// are dropped (classic scripts have React/ReactDOM on window).
function compileJsx(code, label) {
  const cleaned = code.replace(/^\s*import\s+\w+\s+from\s+['"]react(-dom(\/client)?)?['"];?\s*$/mg, '');
  if (/^\s*(import|export)\s/m.test(cleaned)) throw new Error(label + ' still has an import/export line; classic scripts cannot use them.');
  return Babel.transform(cleaned, { presets: ['react'], compact: false, filename: label }).code;
}

// <script type="text/babel" src="X" ...></script> → compiled/X.js?v=hash
function compileExternal(attrs) {
  const srcM = attrs.match(/\ssrc="([^"]+)"/);
  const url = srcM[1].split('?')[0];
  if (url.indexOf(URL_PREFIX) !== 0) return { drop: 'not a local file: ' + url };
  const file = path.join(__dirname, url.slice(URL_PREFIX.length));
  if (!fs.existsSync(file)) return { drop: 'file not found: ' + url };
  const js = compileJsx(fs.readFileSync(file, 'utf8'), path.basename(file));
  const name = path.basename(file).replace(/\.jsx?$/, '') + '.js';
  fs.mkdirSync(COMPILED_DIR, { recursive: true });
  fs.writeFileSync(path.join(COMPILED_DIR, name), js);
  const hash = crypto.createHash('sha1').update(js).digest('hex').slice(0, 10);
  const newAttrs = attrs.replace(srcM[0], ' src="' + URL_PREFIX + 'compiled/' + name + '?v=' + hash + '"');
  return { tag: '<script type="text/javascript"' + newAttrs + '></script>', name };
}

function build() {
  const html = fs.readFileSync(SRC, 'utf8');
  const re = /<script type="text\/babel"([^>]*)>([\s\S]*?)<\/script>/g;
  let out = '';
  let lastIndex = 0;
  let m, count = 0, errors = 0; const externals = [];
  const t0 = Date.now();

  while ((m = re.exec(html))) {
    count++;
    out += html.slice(lastIndex, m.index);
    const attrs = m[1];
    const src = m[2];
    if (/\ssrc="/.test(attrs)) {
      try {
        const r = compileExternal(attrs);
        if (r.drop) { console.warn('Dropped external script (' + r.drop + ')'); out += '<!-- removed by build: ' + r.drop.replace(/--/g, '') + ' -->'; }
        else { out += r.tag; externals.push(r.name); }
      } catch (e) {
        errors++;
        console.error('External script FAILED to compile:', e.message);
        process.exitCode = 1;
        out += '<script type="text/babel"' + attrs + '>' + src + '</script>';
      }
      lastIndex = re.lastIndex;
      continue;
    }
    let transformed;
    try {
      transformed = Babel.transform(src, { presets: ['react'], compact: false }).code;
    } catch (e) {
      errors++;
      console.error('Block ' + count + ' FAILED to transform:', e.message);
      process.exitCode = 1;
      transformed = src; // keep going so all errors are reported in one run
    }
    out += '<script type="text/javascript"' + attrs + '>' + transformed + '</script>';
    lastIndex = re.lastIndex;
  }
  out += html.slice(lastIndex);

  // Babel-standalone is no longer needed once everything is precompiled.
  out = out.replace(/\s*<script src="https:\/\/unpkg\.com\/@babel\/standalone[^"]*"[^>]*><\/script>\n?/, '\n');

  fs.writeFileSync(OUT, out);

  const ms = Date.now() - t0;
  console.log('Precompiled ' + count + ' script block(s) in ' + ms + 'ms, ' + errors + ' error(s).');
  if (externals.length) console.log('Compiled ' + externals.length + ' external file(s) into compiled/: ' + externals.join(', '));
  console.log((html.length / 1024).toFixed(0) + 'KB source -> ' + (out.length / 1024).toFixed(0) + 'KB built -> ' + path.relative(process.cwd(), OUT));
  if (errors > 0) {
    console.error('Build had errors — do not deploy index.built.html until these are fixed.');
  }
}

build();
