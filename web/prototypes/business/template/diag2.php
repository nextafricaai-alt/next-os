<?php
/**
 * CharisOS — Diagnostic 2 (Focused)
 * Finds the tab content switch and action handler.
 * Does NOT modify any files.
 * Upload to public_html/charisos/ and visit once, share output.
 */
$file    = __DIR__ . '/index.html';
$content = file_get_contents($file);
if (!$content) die('ERROR: Cannot read index.html');

echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Diag 2</title>';
echo '<style>body{font-family:monospace;background:#0d1b2a;color:#e2e8f0;padding:20px;}';
echo 'h2{color:#f16623;margin:28px 0 6px;}pre{background:#1e293b;padding:14px;border-radius:8px;';
echo 'overflow-x:auto;border-left:3px solid #f16623;font-size:12px;white-space:pre-wrap;word-break:break-all;}';
echo '.err{color:#f87171;}.ok{color:#22c55e;}.lbl{color:#94a3b8;font-size:11px;}</style></head><body>';
echo '<h1 style="color:#f16623">Diagnostic 2 — Tab Switch &amp; Action Handler</h1>';

function ctx($content, $kw, $title, $pre=300, $post=700) {
  $pos = strpos($content, $kw);
  if ($pos === false) { echo "<h2>$title</h2><p class='err'>NOT FOUND: ".htmlspecialchars($kw)."</p>"; return false; }
  $ln = substr_count(substr($content,0,$pos),"\n")+1;
  $s  = max(0,$pos-$pre);
  echo "<h2>$title</h2><p class='lbl'>Line ~$ln | keyword: <code>".htmlspecialchars($kw)."</code></p>";
  echo '<pre>'.htmlspecialchars(substr($content,$s,$pre+strlen($kw)+$post)).'</pre>';
  return true;
}
function all_ctx($content, $kw, $title, $pre=200, $post=200, $max=4) {
  echo "<h2>$title</h2>";
  $off=0;$n=0;
  while(($pos=strpos($content,$kw,$off))!==false){
    $n++; $ln=substr_count(substr($content,0,$pos),"\n")+1;
    $s=max(0,$pos-$pre);
    echo "<p class='lbl'>Occurrence $n — line ~$ln</p>";
    echo '<pre>'.htmlspecialchars(substr($content,$s,$pre+strlen($kw)+$post)).'</pre>';
    $off=$pos+strlen($kw); if($n>=$max){echo "<p class='lbl'>(first $max only)</p>";break;}
  }
  if(!$n) echo "<p class='err'>NOT FOUND: ".htmlspecialchars($kw)."</p>";
}

echo '<hr style="border-color:#f16623;margin:24px 0">';
echo '<h1 style="color:#f16623">① TAB CONTENT SWITCH</h1>';

/* Look for how _safeTab is used to render content */
ctx($content, "_safeTab === 'overview'",   "Tab switch: overview case (spaces)", 100, 1200);
ctx($content, '_safeTab === "overview"',   "Tab switch: overview case (double quotes)", 100, 1200);
ctx($content, "==='overview'",             "Tab switch: overview case (no spaces)", 100, 1200);
ctx($content, "safeTab=='overview'",       "Tab switch: safeTab==overview", 100, 1200);
/* Fallback: look for where renderProjOverview is CALLED (not defined) */
all_ctx($content, "renderProjOverview(", "All calls to renderProjOverview()", 200, 400, 5);

echo '<hr style="border-color:#f16623;margin:24px 0">';
echo '<h1 style="color:#f16623">② ACTION HANDLER — WHERE ACTIONS ARE PROCESSED</h1>';

/* Find the main action dispatcher */
ctx($content, "saveCallSheet",    "saveCallSheet handler (to find action dispatcher)", 400, 800);
all_ctx($content, "data-action",  "data-action attributes (all, shows pattern)", 100, 200, 3);

/* Look for common action handler patterns */
ctx($content, "function act(",    "act() function definition", 50, 600);
ctx($content, "function handleAction", "handleAction() function", 50, 600);
ctx($content, "var action =",     "action variable assignment", 200, 600);
ctx($content, "dataset.action",   "dataset.action access", 200, 400);

echo '<hr style="border-color:#f16623;margin:24px 0">';
echo '<h1 style="color:#f16623">③ PORTAL TOKEN — CURRENT STATE IN OVERVIEW</h1>';

/* Check what the overview does with portalToken right now */
ctx($content, "portalToken",      "First portalToken reference", 200, 500);
all_ctx($content, "portalToken",  "All portalToken references", 100, 300, 6);

echo '<hr style="border-color:#f16623;margin:24px 0">';
echo '<h1 style="color:#f16623">④ END OF renderProjOverview FUNCTION</h1>';

/* Find the function and show a section near line 7092+800 */
$pos = strpos($content, 'function renderProjOverview(p)');
if ($pos !== false) {
  $section = substr($content, $pos + 2000, 3000); /* skip 2000 chars into fn, show next 3000 */
  echo "<h2>renderProjOverview — interior (chars 2000-5000 from start)</h2>";
  echo '<pre>'.htmlspecialchars($section).'</pre>';
} else {
  echo "<p class='err'>renderProjOverview not found via definition search</p>";
}

echo '<hr style="border-color:#f16623;margin:24px 0">';
echo '<p class="ok">&#10003; Diagnostic 2 complete — no files modified.</p>';
echo '</body></html>';
?>
