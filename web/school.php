<?php
// Per-school front controller. Bakes the ONE authoritative manifest for this
// school into the HTML server-side, so Chrome reads each school's identity from
// the first byte and an installed app can never drift to another school.
// Lean & fast: no per-request network calls. The manifest itself (manifest.php)
// carries the school's name, colour and icon.
$s = isset($_GET['s']) ? strtolower(preg_replace('/[^a-z0-9_-]/', '', $_GET['s'])) : '';
$login = isset($_GET['login']);
$dir = __DIR__ . '/prototypes/schools/peak-primary/';
$file = $login ? ($dir . 'login.html') : ($dir . 'index.html');
$html = @file_get_contents($file);
if ($html === false) { http_response_code(404); echo 'Not found'; exit; }

if ($s !== '') {
  $sx = htmlspecialchars($s, ENT_QUOTES);
  $inject = '<link rel="manifest" href="/manifest.php?s=' . $sx . '">'
          . '<link rel="apple-touch-icon" href="https://nextos-sentinel.nextafricaai.workers.dev/icon.png?s=' . $sx . '">';
  // Place immediately after <head> so the manifest is the first thing the browser sees.
  $html = preg_replace('/<head([^>]*)>/i', '<head$1>' . $inject, $html, 1);
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
echo $html;
