/* src/v4-mobile.jsx */
/* global React, PEAK, V4 */
// Peak Dark · mobile companions — parent + teacher, same brand language as V4 desktop

const PD_M = (function () {
  const T = window.V4.T;
  const D = window.PEAK || window.PEAK_FALLBACK;

  // Phone shell -------------------------------------------------------------
  function Phone({ children, statusInk = T.ink }) {
    return (
      <div style={{ width: 390, height: 780, position: 'relative', display: 'flex' }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 44,
          background: '#000', padding: 6, boxShadow: '0 28px 60px rgba(0,0,0,0.45)',
        }}>
          <div style={{
            position: 'relative', width: '100%', height: '100%', borderRadius: 38,
            background: T.bg, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              width: 100, height: 26, background: '#000', borderRadius: 999, zIndex: 5,
            }} />
            <div style={{
              padding: '14px 26px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 13, fontWeight: 600, color: statusInk, fontFamily: '-apple-system, system-ui',
              position: 'relative', zIndex: 4,
            }}>
              <span>9:41</span>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 11 }}>
                <span>●●●●</span><span>📶</span><span>🔋</span>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    );
  }

  // ─── M · Parent home ──────────────────────────────────────────────────────
  function ParentHome() {
    return (
      <Phone>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 18px 16px', fontFamily: T.font, color: T.ink }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 0 0 1px ' + T.borderStr }}>
              <img src="/prototypes/schools/peak-primary/assets/peak-logo.png" alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            </div>
            <div style={{ lineHeight: 1.15, flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{(typeof window!=='undefined'&&(window.__BRAND_NAME||window.__BRAND_FALLBACK))||'NEXT School OS'}</div>
              <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.04em' }}>{(window.getSchoolCalendarLabel ? window.getSchoolCalendarLabel().termWeekStr : 'Term 2').toUpperCase().replace('WEEK', 'WK')}</div>
            </div>
            <button style={{ width: 36, height: 36, borderRadius: 10, background: T.surface, border: '1px solid ' + T.border, color: T.ink2, fontSize: 14 }}>🔔</button>
          </div>

          {/* greeting */}
          <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>GOOD MORNING, MRS. NAKATO</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: 4 }}>
            Mirembe is at school.
          </div>
          <div style={{ fontSize: 13, color: T.ink3, marginBottom: 20 }}>Marked in at the gate at 07:42.</div>

          {/* hero child card with navy gradient */}
          <div style={{
            background: 'linear-gradient(140deg, ' + T.surface3 + ' 0%, #243686 100%)',
            border: '1px solid ' + T.borderStr, borderRadius: 18, padding: 18, marginBottom: 12,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: 999, border: '1px solid rgba(255,255,255,0.06)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 999, background: T.gold, color: T.bg, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 15 }}>MN</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Mirembe Nakato</div>
                <div style={{ fontSize: 11, color: '#a8b4e8', fontFamily: T.mono }}>P4 Vigilant · Mrs. Namugga</div>
              </div>
              <span style={{ fontSize: 10, color: T.good, background: T.goodSft, padding: '4px 9px', borderRadius: 999, fontWeight: 700, fontFamily: T.mono }}>● PRESENT</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { l: 'In', v: '07:42' },
                { l: 'Bus home', v: '16:30' },
                { l: 'Wk attend', v: '100%' },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ fontSize: 10, color: '#a8b4e8', fontFamily: T.mono, letterSpacing: '0.05em' }}>{s.l.toUpperCase()}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* fees */}
          <div style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Term 2 fees</div>
              <span style={{ fontSize: 10.5, color: T.good, background: T.goodSft, padding: '3px 9px', borderRadius: 999, fontWeight: 700, fontFamily: T.mono }}>PAID</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: T.ink }}>
              UGX 850,000<span style={{ color: T.ink3, fontSize: 13, fontWeight: 400 }}> / 850,000</span>
            </div>
            <div style={{ height: 6, background: T.surface2, borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, ' + T.red + ' 0%, ' + T.gold + ' 100%)' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid ' + T.borderStr, background: 'transparent', color: T.ink, fontSize: 12, fontWeight: 500 }}>Receipt</button>
              <button style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid ' + T.borderStr, background: 'transparent', color: T.ink, fontSize: 12, fontWeight: 500 }}>Statement</button>
            </div>
          </div>

          {/* recent updates */}
          <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', marginBottom: 10, fontWeight: 600 }}>FROM SCHOOL TODAY</div>
          {[
            { t: '07:42', tag: 'ATTENDANCE', text: 'Mirembe marked present at the gate.', tone: T.good, bg: T.goodSft },
            { t: '07:30', tag: 'BROADCAST',  text: 'Term 2 mid-term reports are now available in the portal.', tone: T.gold, bg: 'rgba(232,200,122,0.14)' },
            { t: '07:15', tag: 'CLASS · P4V',text: 'Math quiz today at 08:30 AM — multiplication tables 6-9.', tone: '#a8b4e8', bg: 'rgba(58,79,156,0.20)' },
          ].map((m, i) => (
            <div key={i} style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 13, marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <span style={{ fontSize: 9.5, color: m.tone, fontFamily: T.mono, fontWeight: 700, background: m.bg, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.05em' }}>{m.tag}</span>
                <span style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono }}>{m.t}</span>
              </div>
              <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.4 }}>{m.text}</div>
            </div>
          ))}
        </div>

        {/* bottom nav */}
        <div style={{
          padding: '10px 14px 22px', borderTop: '1px solid ' + T.border, background: T.bg,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
        }}>
          {[
            { g: '◫', l: 'Home', a: 1 },
            { g: '◊', l: 'Messages' },
            { g: '⌗', l: 'Fees' },
            { g: '◇', l: 'Reports' },
          ].map(n => (
            <button key={n.l} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: 7, border: 'none', background: 'transparent',
              color: n.a ? T.red : T.ink3, fontSize: 10, fontWeight: 500,
            }}>
              <span style={{ fontSize: 18 }}>{n.g}</span>
              <span>{n.l}</span>
            </button>
          ))}
        </div>
      </Phone>
    );
  }

  // ─── M · Teacher · register + AI ──────────────────────────────────────────
  function TeacherAI() {
    return (
      <Phone>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 18px 14px', fontFamily: T.font, color: T.ink }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: T.gold, color: T.bg, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>FN</div>
            <div style={{ flex: 1, lineHeight: 1.15 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Mrs. Namugga</div>
              <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono }}>P4 Vigilant · class teacher</div>
            </div>
            <button style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 10, fontWeight: 700, fontFamily: T.mono }}>⌘K</button>
          </div>

          {/* register hero */}
          <div style={{
            background: 'linear-gradient(140deg, ' + T.surface3 + ' 0%, #243686 100%)',
            border: '1px solid ' + T.borderStr, borderRadius: 16, padding: 18, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: '#a8b4e8', fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 700 }}>REGISTER · LIVE</span>
              <span style={{ fontSize: 10, color: T.good, fontFamily: T.mono, fontWeight: 700 }}>● 08:24</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: 44, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>58<span style={{ color: '#a8b4e8' }}>/60</span></div>
              <span style={{ fontSize: 11, color: T.warn, background: T.warnSft, padding: '3px 8px', borderRadius: 999, fontWeight: 700, fontFamily: T.mono }}>2 absent</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 3, marginTop: 14 }}>
              {[...Array(60)].map((_, i) => (
                <div key={i} style={{
                  height: 10, borderRadius: 2,
                  background: i < 58 ? T.good : i < 59 ? T.warn : T.red,
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10.5, color: '#a8b4e8', fontFamily: T.mono }}>
              <span>1 unreached · 30m+</span>
              <span>nudge guardians ›</span>
            </div>
          </div>

          {/* AI hero */}
          <div style={{
            background: T.surface, border: '1px solid ' + T.borderStr, borderRadius: 16, padding: 16, marginBottom: 12,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: T.red, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 11, fontWeight: 700 }}>AI</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Reports ready</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: T.ink3, fontFamily: T.mono }}>47 drafts</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: T.ink2, marginBottom: 14 }}>
              I drafted Term 2 report comments for your 47 students based on quiz scores, attendance, and behaviour notes. Review and send when ready.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, padding: '10px', background: T.red, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>Review 47</button>
              <button style={{ padding: '10px 13px', background: T.surface2, color: T.ink, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500 }}>Tweak</button>
            </div>
          </div>

          {/* suggestions */}
          <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', marginBottom: 10, fontWeight: 600 }}>SUGGESTED · TODAY</div>
          {[
            { tag: 'WAVE',  text: 'Nudge 2 guardians (Mugisha, Lubega)', detail: 'EN + Luganda drafts ready', tone: T.red,  bg: T.redSft },
            { tag: 'NOTE',  text: 'Ruth A. — quiz score dropped 14 pts', detail: 'Topic: Fractions · suggest revision', tone: T.gold, bg: 'rgba(232,200,122,0.14)' },
            { tag: 'PLAN',  text: 'Tomorrow\u2019s Math lesson outline',  detail: 'Builds on today\u2019s quiz results',     tone: T.good, bg: T.goodSft },
          ].map((s, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '54px 1fr auto', gap: 10, padding: '12px 14px',
              background: T.surface, border: '1px solid ' + T.border, borderRadius: 11, marginBottom: 9, alignItems: 'center',
            }}>
              <span style={{
                fontSize: 9.5, fontFamily: T.mono, fontWeight: 700, color: s.tone,
                background: s.bg, padding: '3px 7px', borderRadius: 4, textAlign: 'center', letterSpacing: '0.05em',
              }}>{s.tag}</span>
              <div>
                <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.35 }}>{s.text}</div>
                <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, marginTop: 2 }}>{s.detail}</div>
              </div>
              <span style={{ color: T.ink3, fontSize: 17 }}>›</span>
            </div>
          ))}

          {/* command input */}
          <div style={{
            marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px',
            background: T.surface, border: '1px solid ' + T.border, borderRadius: 999,
          }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: T.red, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 10, fontWeight: 700 }}>AI</span>
            <input placeholder='Try "draft praise for Daniel"' style={{
              border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: 13, color: T.ink, fontFamily: T.font,
            }} />
            <span style={{ fontSize: 10, color: T.ink3, fontFamily: T.mono }}>⌘K</span>
          </div>
        </div>
      </Phone>
    );
  }

  // ─── M · Parent fee detail / Mobile Money flow ────────────────────────────
  function ParentFees() {
    return (
      <Phone>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 18px 16px', fontFamily: T.font, color: T.ink }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <button style={{ width: 36, height: 36, borderRadius: 10, background: T.surface, border: '1px solid ' + T.border, color: T.ink, fontSize: 14 }}>‹</button>
            <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Term 2 · Fees</div>
              <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono }}>BRIAN MUGISHA · P5V</div>
            </div>
            <button style={{ width: 36, height: 36, borderRadius: 10, background: T.surface, border: '1px solid ' + T.border, color: T.ink, fontSize: 14 }}>⋯</button>
          </div>

          {/* big balance card with red urgency */}
          <div style={{
            background: 'linear-gradient(150deg, rgba(226,58,82,0.20) 0%, ' + T.surface + ' 70%)',
            border: '1px solid rgba(226,58,82,0.35)', borderRadius: 18, padding: 20, marginBottom: 14,
          }}>
            <div style={{ fontSize: 10.5, color: T.redInk, fontFamily: T.mono, letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>OUTSTANDING BALANCE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 14, color: T.ink2, fontFamily: T.mono }}>UGX</span>
              <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em' }}>340,000</div>
            </div>
            <div style={{ fontSize: 12, color: T.ink3, marginTop: 8 }}>Of UGX 850,000 term fee · due 31 May</div>
            <div style={{ height: 8, background: T.surface2, borderRadius: 999, marginTop: 16, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '60%', background: T.red, borderRadius: 999 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: T.ink3, fontFamily: T.mono }}>
              <span>510,000 paid</span>
              <span>340,000 due</span>
            </div>
          </div>

          {/* pay options */}
          <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', marginBottom: 10, fontWeight: 600 }}>PAY NOW · MOBILE MONEY</div>
          {[
            { name: 'MTN Mobile Money', code: '*165*3#',   acct: 'PEAK001',  hint: 'fastest · 8s avg', tone: T.gold },
            { name: 'Airtel Money',     code: '*185*9#',   acct: 'PEAK001',  hint: 'fastest · 12s avg', tone: '#e23a52' },
            { name: 'Bank · Stanbic',   code: '9090300411', acct: 'Peak Pri', hint: 'instant transfer', tone: T.navyLite },
          ].map((p, i) => (
            <button key={i} style={{
              width: '100%', display: 'grid', gridTemplateColumns: '46px 1fr auto', gap: 14, alignItems: 'center',
              padding: '14px 14px', background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, marginBottom: 9,
              cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: p.tone, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.mono, fontWeight: 700, fontSize: 11 }}>
                {p.name.split(' ')[0].slice(0, 3).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{p.name}</div>
                <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono, marginTop: 2 }}>
                  <span style={{ color: T.ink2 }}>{p.code}</span> · acct {p.acct}
                </div>
                <div style={{ fontSize: 10.5, color: T.good, marginTop: 3, fontFamily: T.mono }}>{p.hint}</div>
              </div>
              <span style={{ color: T.ink3, fontSize: 18 }}>›</span>
            </button>
          ))}

          {/* recent payments */}
          <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.08em', marginBottom: 10, marginTop: 18, fontWeight: 600 }}>RECENT PAYMENTS</div>
          {[
            { d: '12 May',  who: 'MTN MoMo', amt: 280_000, ref: 'TXN-93421' },
            { d: '24 Apr',  who: 'MTN MoMo', amt: 230_000, ref: 'TXN-91008' },
            { d: '08 Feb',  who: 'Stanbic',  amt: 850_000, ref: 'TXN-87752', note: 'Term 1 · paid' },
          ].map((p, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '12px 0',
              borderTop: i ? '1px solid ' + T.border : 'none',
            }}>
              <div>
                <div style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{p.who}</div>
                <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, marginTop: 2 }}>{p.d} · {p.ref}{p.note ? ' · ' + p.note : ''}</div>
              </div>
              <div style={{ fontSize: 13.5, fontFamily: T.mono, fontWeight: 600, color: T.good }}>+{D.fmtUGXshort(p.amt)}</div>
            </div>
          ))}
        </div>
      </Phone>
    );
  }

  return { ParentHome, TeacherAI, ParentFees };
})();

window.PD_M = PD_M;
