/* os-notify.jsx — NEXT OS Notification Center.
   Toasts + slide-out panel + click-to-source routing.

   Public API:
     window.NEXT_OS.notify({ severity, title, body, source, actionUrl, tenantId })
     window.NEXT_OS.gotoSource(notification)
     window.NEXT_OS.openNotificationPanel()

   actionUrl formats:
     "os://fleet"                       — switch to OS tab (talk/fleet/dashboard/...)
     "prototype:peak-primary#fees"      — open tenant prototype at hash
     "https://..."                      — open URL in new tab
*/

(function () {
  const STORAGE_KEY = 'nextos.notifications.v1';
  const MAX_KEEP = 100;

  const SEVERITY = {
    info:     { color: '#3B82F6', glow: 'rgba(59,130,246,0.25)', label: 'INFO',     icon: 'i' },
    success:  { color: '#00FC8F', glow: 'rgba(0,252,143,0.25)',  label: 'SUCCESS',  icon: '✓' },
    warn:     { color: '#FFB400', glow: 'rgba(255,180,0,0.25)',  label: 'ADVISORY', icon: '!' },
    critical: { color: '#FF4757', glow: 'rgba(255,71,87,0.35)',  label: 'CRITICAL', icon: '✕' },
  };

  // ─── Tenant prototype registry — where each tenant's UI lives ──────
  const TENANT_PROTOTYPES = {
    'peak-primary': 'prototypes/schools/peak-primary/index.html',
  };

  // ─── Concern → deep-link hash for the prototype ────────────────────
  const CONCERN_HASHES = {
    fees_overdue:        '#fees',
    fee_collection_low:  '#fees',
    attendance_dip:      '#attendance',
    at_risk_students:    '#attendance',
    enrollment_pipeline: '#enrollments',
    cash_flow:           '#fees',
  };

  function defaultActionFor(notif) {
    if (notif.actionUrl) return notif.actionUrl;
    if (notif.tenantId && TENANT_PROTOTYPES[notif.tenantId]) {
      const hash = (notif.concernType && CONCERN_HASHES[notif.concernType]) || '';
      return 'prototype:' + notif.tenantId + hash;
    }
    return null;
  }

  // ─── Storage ──────────────────────────────────────────────────────
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function saveHistory(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_KEEP))); }
    catch (e) {}
  }

  // ─── Pub/sub ──────────────────────────────────────────────────────
  const toastListeners = new Set();
  const panelListeners = new Set();
  function emitToast(n) { toastListeners.forEach(fn => { try { fn(n); } catch (e) {} }); }
  function emitPanel()  { panelListeners.forEach(fn => { try { fn(); } catch (e) {} }); }

  // ─── Public: notify ────────────────────────────────────────────────
  function notify(input) {
    const n = {
      id:          'ntf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      severity:    SEVERITY[input.severity] ? input.severity : 'info',
      title:       String(input.title || 'Notification'),
      body:        input.body ? String(input.body) : '',
      source:      input.source || 'NEXT OS',
      tenantId:    input.tenantId || null,
      concernType: input.concernType || null,
      actionUrl:   input.actionUrl || null,
      actionLabel: input.actionLabel || null,
      at:          new Date().toISOString(),
      read:        false,
    };
    n.actionUrl = defaultActionFor(n);
    const history = loadHistory();
    // De-dup: if same title + source within last 5 minutes, skip
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const dup = history.find(h =>
      h.title === n.title && h.source === n.source && new Date(h.at).getTime() > fiveMinAgo
    );
    if (dup) return dup.id;
    history.unshift(n);
    saveHistory(history);
    emitToast(n);
    emitPanel();
    return n.id;
  }

  // ─── Public: gotoSource (route a notification's click) ─────────────
  function gotoSource(notification) {
    const url = notification.actionUrl || defaultActionFor(notification);
    if (!url) return false;
    if (url.startsWith('os://')) {
      const tab = url.slice(5).split(/[?#]/)[0];
      // Find AppShell's state setter via the global hook we install
      if (typeof window.NEXT_OS_NAVIGATE === 'function') {
        window.NEXT_OS_NAVIGATE(tab);
        return true;
      }
      return false;
    }
    if (url.startsWith('prototype:')) {
      const rest = url.slice(10);
      const [tenantId, hash] = rest.includes('#') ? [rest.split('#')[0], '#' + rest.split('#')[1]] : [rest, ''];
      const path = TENANT_PROTOTYPES[tenantId];
      if (path) {
        window.open(path + hash, '_blank', 'noopener,noreferrer');
        return true;
      }
      return false;
    }
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    }
    return false;
  }

  // ─── Public: open/close panel ──────────────────────────────────────
  let _panelOpenSetter = null;
  function openNotificationPanel()  { if (_panelOpenSetter) _panelOpenSetter(true); }
  function closeNotificationPanel() { if (_panelOpenSetter) _panelOpenSetter(false); }

  function markRead(id) {
    const h = loadHistory().map(n => n.id === id ? Object.assign({}, n, { read: true }) : n);
    saveHistory(h);
    emitPanel();
  }
  function markAllRead() {
    const h = loadHistory().map(n => Object.assign({}, n, { read: true }));
    saveHistory(h);
    emitPanel();
  }
  function clearAll() { saveHistory([]); emitToast({ __clear: true }); emitPanel(); }
  function getHistory() { return loadHistory(); }
  function unreadCount() { return loadHistory().filter(n => !n.read).length; }

  window.NEXT_OS = Object.assign(window.NEXT_OS || {}, {
    notify, gotoSource, openNotificationPanel, closeNotificationPanel,
    markRead, markAllRead, clearAll, getHistory, unreadCount,
    info:     (title, body, opts) => notify(Object.assign({ severity: 'info',     title, body }, opts || {})),
    success:  (title, body, opts) => notify(Object.assign({ severity: 'success',  title, body }, opts || {})),
    warn:     (title, body, opts) => notify(Object.assign({ severity: 'warn',     title, body }, opts || {})),
    critical: (title, body, opts) => notify(Object.assign({ severity: 'critical', title, body }, opts || {})),
  });

  // ─── React component: Toast stack ──────────────────────────────────
  function NotificationCenter() {
    const [stack, setStack] = React.useState([]);
    React.useEffect(() => {
      const onNotify = (n) => {
        if (n.__clear) { setStack([]); return; }
        setStack(prev => [n, ...prev].slice(0, 5));
        if (n.severity !== 'critical') {
          const dwell = n.severity === 'warn' ? 9000 : 6000;
          setTimeout(() => setStack(prev => prev.filter(x => x.id !== n.id)), dwell);
        }
      };
      toastListeners.add(onNotify);
      return () => toastListeners.delete(onNotify);
    }, []);

    const dismiss = (id) => setStack(prev => prev.filter(x => x.id !== id));

    const onToastClick = (n) => {
      const ok = gotoSource(n);
      markRead(n.id);
      dismiss(n.id);
      if (!ok) openNotificationPanel();
    };

    return React.createElement('div', {
      style: {
        position: 'fixed', right: 24, bottom: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 12,
        maxWidth: 380, width: 'calc(100vw - 48px)', pointerEvents: 'none',
      }
    }, stack.map(n => {
      const s = SEVERITY[n.severity];
      const clickable = !!defaultActionFor(n);
      return React.createElement('div', {
        key: n.id,
        onClick: clickable ? () => onToastClick(n) : null,
        style: {
          background: 'rgba(20, 0, 53, 0.96)',
          border: '1px solid ' + s.color,
          borderLeft: '4px solid ' + s.color,
          borderRadius: 10, padding: '14px 16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45), 0 0 30px ' + s.glow,
          backdropFilter: 'blur(12px)', color: '#f5f6fa',
          fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)',
          pointerEvents: 'auto',
          animation: 'nextos-toast-in 0.28s cubic-bezier(0.2, 0.9, 0.2, 1)',
          position: 'relative',
          cursor: clickable ? 'pointer' : 'default',
        }
      }, [
        React.createElement('div', { key: 'hdr',
          style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: n.body ? 6 : 0 }
        }, [
          React.createElement('span', { key: 'icon',
            style: { width: 20, height: 20, borderRadius: '50%',
              background: s.color, color: '#0A001A',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0 }
          }, s.icon),
          React.createElement('span', { key: 'sev',
            style: { fontSize: 9, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              letterSpacing: 1.5, color: s.color, fontWeight: 600 }
          }, s.label),
          React.createElement('span', { key: 'src',
            style: { fontSize: 9, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              letterSpacing: 1, color: 'rgba(255,255,255,0.4)',
              marginLeft: 'auto', marginRight: 24, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }
          }, (n.source || 'NEXT OS').toUpperCase()),
          React.createElement('button', { key: 'x',
            onClick: (e) => { e.stopPropagation(); dismiss(n.id); },
            style: { position: 'absolute', top: 8, right: 8,
              background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 },
            'aria-label': 'Dismiss',
          }, '×'),
        ]),
        React.createElement('div', { key: 'title',
          style: { fontSize: 14, fontWeight: 600, lineHeight: 1.35, color: '#f5f6fa', marginBottom: n.body ? 4 : 0 }
        }, n.title),
        n.body ? React.createElement('div', { key: 'body',
          style: { fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.7)' }
        }, n.body) : null,
        clickable ? React.createElement('div', { key: 'hint',
          style: { fontSize: 10, color: s.color, marginTop: 8,
            fontFamily: 'JetBrains Mono, ui-monospace, monospace', letterSpacing: 1 }
        }, 'CLICK TO OPEN →') : null,
      ]);
    }));
  }

  // ─── React component: Notification Panel (slide-out from right) ────
  function NotificationPanel() {
    const [open, setOpen] = React.useState(false);
    const [history, setHistory] = React.useState(loadHistory());

    React.useEffect(() => {
      _panelOpenSetter = setOpen;
      const onPanel = () => setHistory(loadHistory());
      panelListeners.add(onPanel);
      return () => { _panelOpenSetter = null; panelListeners.delete(onPanel); };
    }, []);

    if (!open) return null;

    const onItemClick = (n) => {
      const ok = gotoSource(n);
      markRead(n.id);
      setHistory(loadHistory());
      if (ok) setOpen(false);
    };

    const formatTime = (iso) => {
      try {
        const d = new Date(iso);
        const diff = Math.round((Date.now() - d) / 60000);
        if (diff < 1) return 'just now';
        if (diff < 60) return diff + 'm';
        if (diff < 60 * 24) return Math.round(diff / 60) + 'h';
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } catch (e) { return ''; }
    };

    return React.createElement(React.Fragment, null, [
      // Backdrop
      React.createElement('div', {
        key: 'backdrop',
        onClick: () => setOpen(false),
        style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)', zIndex: 9998 }
      }),
      // Panel
      React.createElement('div', {
        key: 'panel',
        style: { position: 'fixed', top: 0, right: 0, height: '100vh',
          width: 420, maxWidth: '100vw', zIndex: 9999,
          background: '#140035', borderLeft: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          animation: 'nextos-panel-in 0.25s cubic-bezier(0.2, 0.9, 0.2, 1)',
        }
      }, [
        // Header
        React.createElement('div', { key: 'hdr',
          style: { padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
        }, [
          React.createElement('div', { key: 'title' }, [
            React.createElement('div', { key: 'pre',
              style: { fontSize: 10, fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                letterSpacing: 2, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }
            }, 'NOTIFICATIONS'),
            React.createElement('div', { key: 'h',
              style: { fontSize: 18, fontWeight: 600, color: '#f5f6fa' }
            }, history.length + ' total · ' + history.filter(h => !h.read).length + ' unread'),
          ]),
          React.createElement('div', { key: 'actions', style: { display: 'flex', gap: 8 } }, [
            React.createElement('button', { key: 'mar',
              onClick: () => { markAllRead(); setHistory(loadHistory()); },
              style: { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.7)', fontSize: 11, padding: '6px 10px',
                borderRadius: 6, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: 1 }
            }, 'MARK ALL READ'),
            React.createElement('button', { key: 'close',
              onClick: () => setOpen(false),
              style: { background: 'transparent', border: 'none',
                color: 'rgba(255,255,255,0.6)', fontSize: 22, cursor: 'pointer',
                padding: '2px 8px' }
            }, '×'),
          ]),
        ]),
        // List
        React.createElement('div', { key: 'list',
          style: { flex: 1, overflowY: 'auto', padding: '12px 16px' }
        }, history.length === 0
          ? React.createElement('div', {
              style: { padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)',
                fontSize: 13 }
            }, 'No notifications yet. Nia will surface things here as they happen.')
          : history.map(n => {
              const s = SEVERITY[n.severity] || SEVERITY.info;
              const clickable = !!defaultActionFor(n);
              return React.createElement('div', {
                key: n.id,
                onClick: clickable ? () => onItemClick(n) : null,
                style: {
                  padding: 14, marginBottom: 8, borderRadius: 8,
                  background: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(0,252,143,0.04)',
                  border: '1px solid ' + (n.read ? 'rgba(255,255,255,0.05)' : s.color + '40'),
                  borderLeft: '3px solid ' + s.color,
                  cursor: clickable ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }
              }, [
                React.createElement('div', { key: 'r1',
                  style: { display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 6, fontSize: 9,
                    fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5 }
                }, [
                  React.createElement('span', { key: 'sev', style: { color: s.color, fontWeight: 600 } }, s.label),
                  React.createElement('span', { key: 'sep', style: { color: 'rgba(255,255,255,0.3)' } }, '·'),
                  React.createElement('span', { key: 'src', style: { color: 'rgba(255,255,255,0.5)' } }, n.source.toUpperCase()),
                  React.createElement('span', { key: 'sep2', style: { color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' } }, formatTime(n.at)),
                ]),
                React.createElement('div', { key: 'title',
                  style: { fontSize: 13, fontWeight: 600, color: '#f5f6fa',
                    marginBottom: n.body ? 4 : 0, lineHeight: 1.4 }
                }, n.title),
                n.body ? React.createElement('div', { key: 'body',
                  style: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }
                }, n.body) : null,
                clickable ? React.createElement('div', { key: 'cta',
                  style: { marginTop: 8, fontSize: 10, color: s.color,
                    fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1 }
                }, 'OPEN SOURCE →') : null,
              ]);
            })
        ),
      ]),
    ]);
  }

  // CSS animations
  if (!document.getElementById('nextos-notify-styles')) {
    const style = document.createElement('style');
    style.id = 'nextos-notify-styles';
    style.textContent =
      '@keyframes nextos-toast-in { from { opacity: 0; transform: translateX(12px) translateY(8px); } to { opacity: 1; transform: translateX(0) translateY(0); } }' +
      '@keyframes nextos-panel-in { from { transform: translateX(100%); } to { transform: translateX(0); } }';
    document.head.appendChild(style);
  }

  window.NotificationCenter = NotificationCenter;
  window.NotificationPanel  = NotificationPanel;
})();
