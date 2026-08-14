<?php
/**
 * CharisOS — Diagnostic Tool
 * Upload to public_html/charisos/ and visit once.
 * Shows the exact code sections needed to wire portal workflow.
 * Does NOT modify any files.
 */

$file    = __DIR__ . '/index.html';
$content = file_get_contents($file);
if (!$content) { die('ERROR: Cannot read index.html'); }

echo '<!DOCTYPE html><html><head><meta charset="UTF-8">';
echo '<title>CharisOS Diagnostic</title>';
echo '<style>
  body { font-family: monospace; background: #0d1b2a; color: #e2e8f0; padding: 20px; }
  h2   { color: #f16623; margin-top: 30px; }
  pre  { background: #1e293b; padding: 14px; border-radius: 8px; overflow-x: auto;
         border-left: 3px solid #f16623; font-size: 12px; white-space: pre-wrap; word-break: break-all; }
  .ok  { color: #22c55e; font-weight: bold; }
  .err { color: #f87171; font-weight: bold; }
  .lbl { color: #94a3b8; font-size: 11px; }
</style></head><body>';

echo '<h1 style="color:#f16623">CharisOS — Workflow Diagnostic</h1>';
echo '<p style="color:#94a3b8">File size: <strong style="color:#fff">' . number_format(strlen($content)) . ' bytes</strong></p>';

// ─── Helper: extract context around a keyword ───
function show_context($content, $keyword, $label, $before = 300, $after = 600) {
    $pos = strpos($content, $keyword);
    if ($pos === false) {
        echo '<h2>' . htmlspecialchars($label) . '</h2>';
        echo '<p class="err">NOT FOUND: ' . htmlspecialchars($keyword) . '</p>';
        return false;
    }
    $start   = max(0, $pos - $before);
    $excerpt = substr($content, $start, $before + strlen($keyword) + $after);
    $line    = substr_count(substr($content, 0, $pos), "\n") + 1;
    echo '<h2>' . htmlspecialchars($label) . '</h2>';
    echo '<p class="lbl">Found at ~line ' . $line . ' | keyword: <code>' . htmlspecialchars($keyword) . '</code></p>';
    echo '<pre>' . htmlspecialchars($excerpt) . '</pre>';
    return true;
}

// ─── Helper: show ALL occurrences ───
function show_all($content, $keyword, $label, $ctx = 200) {
    $offset = 0; $found = 0;
    echo '<h2>' . htmlspecialchars($label) . '</h2>';
    while (($pos = strpos($content, $keyword, $offset)) !== false) {
        $found++;
        $start   = max(0, $pos - $ctx);
        $excerpt = substr($content, $start, $ctx + strlen($keyword) + $ctx);
        $line    = substr_count(substr($content, 0, $pos), "\n") + 1;
        echo '<p class="lbl">Occurrence ' . $found . ' — line ~' . $line . '</p>';
        echo '<pre>' . htmlspecialchars($excerpt) . '</pre>';
        $offset = $pos + strlen($keyword);
        if ($found >= 4) { echo '<p class="lbl">(showing first 4 only)</p>'; break; }
    }
    if ($found === 0) echo '<p class="err">NOT FOUND: ' . htmlspecialchars($keyword) . '</p>';
    return $found;
}

// ═══════════════════════════════════════
// SECTION 1 — Project Tabs Definition
// ═══════════════════════════════════════
echo '<hr style="border-color:#f16623;margin:30px 0">';
echo '<h1 style="color:#f16623">① PROJECT TABS</h1>';
show_all($content, 'Call Sheet', 'All occurrences of "Call Sheet" (shows tab system structure)', 250);
show_context($content, 'S.projTab', 'Project tab state variable (S.projTab)', 100, 500);
show_context($content, 'projTabs', 'Project tabs array definition', 50, 400);

// ═══════════════════════════════════════
// SECTION 2 — Portal Link in Project Overview
// ═══════════════════════════════════════
echo '<hr style="border-color:#f16623;margin:30px 0">';
echo '<h1 style="color:#f16623">② PORTAL LINK IN PROJECT OVERVIEW</h1>';
show_context($content, 'sendPortalLink', 'sendPortalLink handler (action)', 100, 400);
show_context($content, 'client-portal/?token=', 'Portal URL reference (where it\'s built/rendered)', 300, 400);
show_context($content, 'Generate Portal Link', 'Generate Portal Link button (in render)', 100, 500);

// ═══════════════════════════════════════
// SECTION 3 — Stage Advance Handler
// ═══════════════════════════════════════
echo '<hr style="border-color:#f16623;margin:30px 0">';
echo '<h1 style="color:#f16623">③ STAGE ADVANCE HANDLER</h1>';
show_context($content, 'advanceStage', 'advanceStage action handler', 50, 600);
show_context($content, 'Booking Confirmed', 'Booking Confirmed stage reference', 200, 400);
show_context($content, 'nextStage', 'nextStage variable', 100, 400);

// ═══════════════════════════════════════
// SECTION 4 — Project Overview Render Function
// ═══════════════════════════════════════
echo '<hr style="border-color:#f16623;margin:30px 0">';
echo '<h1 style="color:#f16623">④ PROJECT OVERVIEW RENDER FUNCTION</h1>';
show_context($content, 'renderProjectOverview', 'renderProjectOverview function', 50, 800);
show_context($content, 'renderProjOverview', 'renderProjOverview (alt name)', 50, 800);
show_context($content, "'Overview'", 'Overview tab render case', 100, 600);

// ═══════════════════════════════════════
// SECTION 5 — Project Data Fields
// ═══════════════════════════════════════
echo '<hr style="border-color:#f16623;margin:30px 0">';
echo '<h1 style="color:#f16623">⑤ PROJECT DATA — KEY FIELDS</h1>';
show_context($content, 'proj.phone', 'How client phone is accessed on project', 200, 300);
show_context($content, 'portalToken', 'portalToken field on project', 100, 300);
show_context($content, '_toProject', '_toProject function (field mapping)', 50, 500);

echo '<hr style="border-color:#f16623;margin:30px 0">';
echo '<p class="ok">✓ Diagnostic complete — no files modified.</p>';
echo '<p style="color:#94a3b8">Share this full page output so the correct patch can be written.</p>';
echo '</body></html>';
?>
