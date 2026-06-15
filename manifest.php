<?php
// Per-school PWA manifest. Served same-origin so start_url/scope are valid.
header('Content-Type: application/manifest+json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=300');

$s = isset($_GET['s']) ? strtolower(preg_replace('/[^a-z0-9_-]/', '', $_GET['s'])) : '';

$name  = 'NEXT School OS';
$color = '#00FC8F';
$logo  = '';

if ($s !== '') {
  $ctx = stream_context_create(['http' => ['timeout' => 4]]);
  $j = @file_get_contents('https://nextos-sentinel.nextafricaai.workers.dev/brand?s=' . urlencode($s), false, $ctx);
  if ($j) {
    $b = json_decode($j, true);
    if (is_array($b)) {
      if (!empty($b['name']))          $name  = $b['name'];
      if (!empty($b['primary_color'])) $color = $b['primary_color'];
      if (!empty($b['logo_url']))      $logo  = $b['logo_url'];
    }
  }
}

$icon  = $logo !== '' ? $logo : ('https://nextos-sentinel.nextafricaai.workers.dev/icon?s=' . urlencode($s));
$itype = $logo !== '' ? 'image/png' : 'image/svg+xml';
$start = 'https://nextos.nextafrica.ai/school/' . $s;

$short = (function($n){ return (function_exists('mb_substr') ? mb_substr($n,0,12) : substr($n,0,12)); })($name);

echo json_encode([
  'name'             => $name,
  'short_name'       => $short,
  'description'      => $name . ' — school operating system, powered by NEXT OS.',
  'start_url'        => $start,
  'id'               => '/school/' . $s,
  'scope'            => 'https://nextos.nextafrica.ai/school/' . $s,
  'display'          => 'standalone',
  'orientation'      => 'portrait',
  'background_color' => '#0a1029',
  'theme_color'      => $color,
  'icons'            => ($s !== '' ? [
    ['src' => 'https://nextos-sentinel.nextafricaai.workers.dev/icon.png?s=' . urlencode($s), 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any'],
    ['src' => 'https://nextos-sentinel.nextafricaai.workers.dev/icon.png?s=' . urlencode($s), 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
    ['src' => 'https://nextos-sentinel.nextafricaai.workers.dev/icon.png?s=' . urlencode($s), 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
  ] : [
    ['src' => 'https://nextos.nextafrica.ai/icon-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any'],
  ]),
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
