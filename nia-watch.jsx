/* nia-watch.jsx — Nia's Watch Widget + on-load brief toasts.
   When Hudson opens NEXT OS, Nia greets him with what happened while
   he was away. Fetches /briefs from the Sentinel worker on mount,
   surfaces unread briefs as toasts, and renders a card on Dashboard.
*/

(function () {
  const BRIEFS_ENDPOINT_BASE = (typeof window !== 'undefined' && window.NEXT_OS_SENTINEL_ENDPOINT)
    || 'https://nextos-sentinel.nextafricaai.workers.dev';

  // ─── Fetcher ────────────────────────────────────────────────────────
  async function fetchBriefs() {
    try {
      const res = await fetch(BRIEFS_ENDPOINT_BASE + '/briefs');
      if (!res.ok) return { briefs: [], unreadCount: 0, error: 'HTTP ' + res.status };
      const data = await res.json();
      return data && Array.isArray(data.briefs)
        ? data
        : { briefs: [], unreadCount: 0 };
    } catch (e) {
      return { briefs: [], unreadCount: 0, error: String(e.message || e) };
    }
  }

  async function markRead(ids) {
    if (!ids || ids.length === 0) return;
    try {
      await fetch(BRIEFS_ENDPOINT_BASE + '/briefs/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    } catch (e) { /* silent */ }
  }

  // Track which brief IDs we've already shown so polling doesn't repeat them
  const seenBriefs = new Set();

  // For each finding (concern) in a brief, emit a separate clickable toast
  // that drives Hudson directly to that tenant's prototype at the right hash.
  function surfaceBrief(b) {
    if (seenBriefs.has(b.id)) return;
    seenBriefs.add(b.id);
    if (!window.NEXT_OS || typeof window.NEXT_OS.notify !== 'function') return;

    const ts = new Date(b.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const kindLabel = b.kind === 'morning' ? 'Morning brief'
                    : b.kind === 'weekly'  ? 'Weekly wrap'
                    : 'Pulse check';

    // If there are findings, surface one toast PER concern so each one
    // navigates to its specific source when clicked.
    const findings = b.findings || [];
    const concerns = [];
    findings.forEach(f => (f.concerns || []).forEach(c => {
      concerns.push({ tenantId: f.tenantId, name: f.name, concern: c });
    }));

    if (concerns.length === 0) {
      // Quiet brief — just one info toast
      window.NEXT_OS.notify({
        severity: 'info',
        title: kindLabel + ' — all clear',
        body: (b.text || '').slice(0, 180),
        source: 'Nia · ' + ts,
      });
      return;
    }

    // Lead toast — summary
    window.NEXT_OS.notify({
      severity: 'warn',
      title: kindLabel + ' · ' + concerns.length + ' thing' + (concerns.length === 1 ? '' : 's') + ' to look at',
      body: (b.text || '').slice(0, 180),
      source: 'Nia · ' + ts,
    });

    // Then one toast per concern, staggered, each clickable to its source
    concerns.slice(0, 4).forEach((c, i) => {
      setTimeout(() => {
        window.NEXT_OS.notify({
          severity: c.concern.severity === 'warn' ? 'warn' : 'info',
          title: c.name + ' — ' + c.concern.type.replace(/_/g, ' '),
          body: c.concern.summary,
          source: 'Nia · click to open',
          tenantId: c.tenantId,
          concernType: c.concern.type,
        });
      }, 400 * (i + 1));
    });

    // Show what Nia DID about each finding (auto-fix actions she took)
    const actions = b.actions || [];
    actions.slice(0, 4).forEach((a, i) => {
      setTimeout(() => {
        const isApprovalNeeded = a.requiresApproval;
        window.NEXT_OS.notify({
          severity: isApprovalNeeded ? 'info' : 'success',
          title: 'Nia ' + (isApprovalNeeded ? 'prepared' : 'handled') + ': ' + (a.tenantName || ''),
          body: a.humanReadable || a.result,
          source: 'Nia · auto-action',
          tenantId: a.tenantId,
          concernType: a.concernType,
        });
      }, 400 * (concerns.slice(0, 4).length + i + 1));
    });
  }

  // ─── On-load toast trigger ──────────────────────────────────────────
  let bootRan = false;
  async function bootBriefToasts() {
    if (bootRan) return;
    bootRan = true;
    await new Promise(r => setTimeout(r, 800));
    const data = await fetchBriefs();
    const unread = (data.briefs || []).filter(b => !b.read);
    if (unread.length === 0) return;
    // Surface the 2 most recent unread briefs
    unread.slice(0, 2).forEach(surfaceBrief);
    markRead(unread.slice(0, 2).map(b => b.id));
  }

  // ─── Live polling — every 30s while OS is open, check for new briefs
  async function pollOnce() {
    const data = await fetchBriefs();
    const unread = (data.briefs || []).filter(b => !b.read && !seenBriefs.has(b.id));
    if (unread.length === 0) return;
    // Show ONLY the newest one to avoid spamming during long sessions
    surfaceBrief(unread[0]);
    markRead([unread[0].id]);
  }
  function startPolling() {
    setInterval(pollOnce, 30000);
  }

  // ─── Dashboard widget ──────────────────────────────────────────────
  function NiaWatchWidget() {
    const [data, setData] = React.useState({ briefs: [], unreadCount: 0, loading: true });
    const [expanded, setExpanded] = React.useState(false);

    const refresh = React.useCallback(async () => {
      setData(d => Object.assign({}, d, { loading: true }));
      const r = await fetchBriefs();
      setData({ briefs: r.briefs || [], unreadCount: r.unreadCount || 0, error: r.error, loading: false });
    }, []);

    React.useEffect(() => {
      refresh();
      const id = setInterval(refresh, 60000); // re-poll every 60s
      return () => clearInterval(id);
    }, [refresh]);

    const latest = data.briefs[0];
    const rest = data.briefs.slice(1, 8);
    const formatTime = (iso) => {
      try {
        const d = new Date(iso);
        const now = new Date();
        const diffMin = Math.round((now - d) / 60000);
        if (diffMin < 1) return 'just now';
        if (diffMin < 60) return diffMin + 'm ago';
        if (diffMin < 60 * 24) return Math.round(diffMin / 60) + 'h ago';
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } catch (e) { return ''; }
    };
    const kindLabel = (k) => k === 'morning' ? 'MORNING BRIEF' : k === 'weekly' ? 'WEEKLY WRAP' : 'PULSE CHECK';

    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 24, marginBottom: 24,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--mint-glow)', color: 'var(--mint)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
            }}>N</div>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 1.5, color: 'var(--text-tertiary)' }}>NIA'S WATCH</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                What happened while you were away
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {data.unreadCount > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text-inverse)',
                background: 'var(--mint)', padding: '3px 8px', borderRadius: 10,
                fontFamily: 'var(--font-mono)',
              }}>{data.unreadCount} NEW</span>
            )}
            <button onClick={refresh} style={{
              background: 'transparent', border: '1px solid var(--border-subtle)',
              color: 'var(--text-tertiary)', fontSize: 11, padding: '4px 10px',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', letterSpacing: 1,
            }}>{data.loading ? '...' : 'REFRESH'}</button>
          </div>
        </div>

        {!latest && !data.loading && (
          <div style={{
            padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)',
            fontSize: 13, lineHeight: 1.6,
          }}>
            {data.error
              ? 'Nia’s briefs aren’t reachable yet. Deploy the worker and trigger one via /supervise to test.'
              : 'No briefs yet. Nia’s first cron fires at 6:30 AM EAT, or trigger one manually:'}
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--mint)',
              marginTop: 10, padding: '8px 12px', background: 'var(--bg-deep)',
              borderRadius: 6, display: 'inline-block',
            }}>POST {BRIEFS_ENDPOINT_BASE}/supervise</div>
          </div>
        )}

        {latest && (
          <div style={{
            background: 'var(--bg-deep)',
            border: '1px solid ' + (latest.read ? 'var(--border-subtle)' : 'var(--mint)'),
            borderRadius: 'var(--radius-sm)', padding: 16,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
              fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1.5,
            }}>
              <span style={{ color: 'var(--mint)' }}>{kindLabel(latest.kind)}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>·</span>
              <span style={{ color: 'var(--text-tertiary)' }}>{formatTime(latest.at)}</span>
              {latest.sentToWA && <span style={{ color: 'var(--text-tertiary)' }}>· WHATSAPPED</span>}
            </div>
            <div style={{
              fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.55,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>{latest.text}</div>
            {latest.findings && latest.findings.length > 0 && (
              <div style={{
                marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)',
                display: 'flex', flexWrap: 'wrap', gap: 6,
              }}>
                {latest.findings.flatMap(f => f.concerns || []).slice(0, 5).map((c, i) => (
                  <span key={i} style={{
                    fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1,
                    color: c.severity === 'warn' ? 'var(--gold)' : 'var(--text-tertiary)',
                    background: c.severity === 'warn' ? 'rgba(255,180,0,0.08)' : 'var(--bg-surface)',
                    padding: '2px 8px', borderRadius: 4,
                    border: '1px solid ' + (c.severity === 'warn' ? 'var(--gold)' : 'var(--border-subtle)'),
                  }}>{c.type.replace(/_/g, ' ').toUpperCase()}</span>
                ))}
              </div>
            )}
            {latest.actions && latest.actions.length > 0 && (
              <div style={{
                marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)',
              }}>
                <div style={{
                  fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1.5,
                  color: 'var(--mint)', marginBottom: 8,
                }}>WHAT NIA DID</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {latest.actions.slice(0, 4).map((a, i) => (
                    <div key={i} style={{
                      fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5,
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                    }}>
                      <span style={{
                        color: a.requiresApproval ? 'var(--gold)' : 'var(--mint)',
                        flexShrink: 0, marginTop: 2, fontSize: 11,
                      }}>{a.requiresApproval ? '⏳' : '✓'}</span>
                      <span>{a.humanReadable || a.result}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {rest.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <button onClick={() => setExpanded(e => !e)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 1,
              color: 'var(--text-tertiary)', padding: 0,
            }}>{expanded ? 'HIDE EARLIER BRIEFS' : 'SHOW ' + rest.length + ' EARLIER BRIEF' + (rest.length === 1 ? '' : 'S')}</button>
            {expanded && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rest.map(b => (
                  <div key={b.id} style={{
                    padding: 12, background: 'var(--bg-deep)',
                    border: '1px solid var(--border-subtle)', borderRadius: 6,
                  }}>
                    <div style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
                      letterSpacing: 1.5, marginBottom: 4,
                    }}>{kindLabel(b.kind)} · {formatTime(b.at)}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {(b.text || '').slice(0, 200)}{(b.text || '').length > 200 ? '…' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  window.NiaWatchWidget = NiaWatchWidget;
  window.NiaWatchBoot = bootBriefToasts;

  // Auto-fire on load — runs once when the OS finishes booting
  if (typeof document !== 'undefined') {
    const boot = () => { setTimeout(bootBriefToasts, 1500); setTimeout(startPolling, 5000); };
    if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
    else document.addEventListener('DOMContentLoaded', boot);
  }
})();
