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

const SRC = path.join(__dirname, 'index.html');
const OUT = path.join(__dirname, 'index.built.html');

function build() {
  const html = fs.readFileSync(SRC, 'utf8');
  const re = /<script type="text\/babel"([^>]*)>([\s\S]*?)<\/script>/g;
  let out = '';
  let lastIndex = 0;
  let m, count = 0, errors = 0;
  const t0 = Date.now();

  while ((m = re.exec(html))) {
    count++;
    out += html.slice(lastIndex, m.index);
    const attrs = m[1];
    const src = m[2];
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
  console.log((html.length / 1024).toFixed(0) + 'KB source -> ' + (out.length / 1024).toFixed(0) + 'KB built -> ' + path.relative(process.cwd(), OUT));
  if (errors > 0) {
    console.error('Build had errors — do not deploy index.built.html until these are fixed.');
  }
}

build();
