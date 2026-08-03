/* NIA_FEED + NiaBell — reliable in-OS notification centre (localStorage, no push dependency) with Nia's friendly, encouraging, suggestive messages. */
(function () {
  const T = window.V4.T;
  function tenant() { try { return (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || 'peak-primary'; } catch (e) { return 'peak-primary'; } }
  function KEY() { return 'nia.feed.' + tenant(); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY()) || '[]'); } catch (e) { return []; } }
  function save(list) { try { localStorage.setItem(KEY(), JSON.stringify(list.slice(0, 60))); } catch (e) {} }
  const FEED = {
    list: load,
    unread: function () { return load().filter(n => !n.read).length; },
    markAllRead: function () { var l = load().map(n => Object.assign({}, n, { read: true })); save(l); try { window.dispatchEvent(new CustomEvent('nia:feed')); } catch (e) {} },
    post: function (item) {
      var l = load();
      if (item.key) { var now = Date.now(); var dup = l.find(n => n.key === item.key && (now - (n.ts || 0)) < 20 * 3600 * 1000); if (dup) return; }
      l.unshift(Object.assign({ id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6), ts: Date.now(), read: false }, item));
      save(l);
      try { window.dispatchEvent(new CustomEvent('nia:feed')); } catch (e) {}
      if (item.toast !== false && window.peakToast) window.peakToast(item.title, item.level === 'alert' ? 'info' : 'success', item.body);
    }
  };
  window.NIA_FEED = FEED;

  const { useState, useEffect } = React;
  function NiaBell() {
    const [open, setOpen] = useState(false);
    const [, force] = useState(0);
    useEffect(() => { const h = () => force(x => x + 1); window.addEventListener('nia:feed', h); return () => window.removeEventListener('nia:feed', h); }, []);
    const items = FEED.list();
    const unread = items.filter(n => !n.read).length;
    const toggle = () => { const nx = !open; setOpen(nx); if (nx && unread) setTimeout(() => FEED.markAllRead(), 600); };
    const levelColor = (lv) => lv === 'win' ? (T.green || '#00c389') : lv === 'alert' ? T.warn : (T.gold || '#d8a200');
    const ago = (ts) => { const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return 'now'; if (m < 60) return m + 'm'; const h = Math.round(m / 60); if (h < 24) return h + 'h'; return Math.round(h / 24) + 'd'; };
    const btnRef = React.useRef(null);
    const [pos, setPos] = useState(null);
    useEffect(() => {
      if (!open) return;
      const place = () => {
        const r = btnRef.current && btnRef.current.getBoundingClientRect(); if (!r) return;
        const vw = window.innerWidth, vh = window.innerHeight, W = Math.min(340, vw - 20);
        let left = r.left; if (left + W > vw - 10) left = r.right - W; if (left < 10) left = 10;
        const top = Math.min(r.bottom + 8, vh - 80);
        setPos({ left: Math.round(left), top: Math.round(top), width: W, maxHeight: Math.round(vh - top - 16) });
      };
      place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
      return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
    }, [open]);
    return (
      <div style={{ position: 'relative' }}>
        <button ref={btnRef} onClick={toggle} title="Nia's notifications" style={{ width: 34, height: 34, borderRadius: 9, background: T.surface, border: '1px solid ' + T.border, color: T.ink2, fontSize: 15, cursor: 'pointer', position: 'relative' }}>
          🔔{unread > 0 && <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: T.red, color: '#fff', fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center', fontFamily: T.mono }}>{unread > 9 ? '9+' : unread}</span>}
        </button>
        {open && pos && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 600 }} />
            <div style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxHeight, overflow: 'auto', background: T.surface, border: '1px solid ' + T.border, borderRadius: 14, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 601 }}>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid ' + T.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Nia</div>
                <div style={{ fontSize: 11, color: T.ink3 }}>{items.length} update{items.length === 1 ? '' : 's'}</div>
              </div>
              {items.length === 0 ? <div style={{ padding: 22, fontSize: 13, color: T.ink3, textAlign: 'center' }}>Nia will post here as you work — wins, tips and things to look at.</div> : items.map(n => (
                <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid ' + T.border, display: 'flex', gap: 11 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: T.bg, border: '1px solid ' + T.border, display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0 }}>{n.icon || '💚'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={{ fontSize: 13, fontWeight: 700, color: levelColor(n.level) }}>{n.title}</span><span style={{ fontSize: 10, color: T.ink4, fontFamily: T.mono, flexShrink: 0 }}>{ago(n.ts)}</span></div>
                    <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5, marginTop: 3 }}>{n.body}</div>
                    {n.cta && n.cta.route && <button onClick={() => { setOpen(false); window.peakNav && window.peakNav(n.cta.route); }} style={{ marginTop: 8, background: 'transparent', border: '1px solid ' + (T.green || '#00c389'), color: (T.green || '#00c389'), borderRadius: 7, padding: '5px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{n.cta.label} →</button>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }
  window.NiaBell = NiaBell;
})();
