import React from 'react';

/* head-timetable-panel.jsx
   Sarah's digital timetable — color-coded by live activity.

   Pulls today's slots + cross-references with teacher_checkins and
   student_roll_call. Each cell gets a status:

     GREEN  — slot has happened or is happening, roll call taken
     ORANGE — slot is now or next, teacher checked in, roll not yet taken
     RED    — slot is past/now, teacher not checked in or roll not taken
     GRAY   — unassigned slot (no teacher), or out-of-school time

   Polls every 30s for live updates.

   Exposed as window.HeadTimetablePanel.
*/
(function () {
  const { useState, useEffect, useMemo, useCallback } = React;

  const T = {
    bg:       (typeof window!=='undefined'&&window.__BG)||'#0a1029',
    surface:  (typeof window!=='undefined'&&window.__SURFACE)||'#141e3c',
    surface2: (typeof window!=='undefined'&&window.__SURFACE2)||'#1a2548',
    surface3: (typeof window!=='undefined'&&window.__SURFACE3)||'#212d56',
    border:   'rgba(255,255,255,0.06)',
    borderStr:'rgba(255,255,255,0.10)',
    ink:      '#f5f6fa',
    ink2:     'rgba(245,246,250,0.85)',
    ink3:     'rgba(245,246,250,0.55)',
    ink4:     'rgba(245,246,250,0.40)',
    red:      '#FF4757',
    green:    (typeof window!=='undefined'&&window.__ACCENT)||'#00FC8F',
    gold:     '#FFB400',
    blue:     '#3B82F6',
    font:     "'Inter', -apple-system, system-ui, sans-serif",
    mono:     "'JetBrains Mono', ui-monospace, monospace",
    serif:    "'Instrument Serif', serif",
  };

  const isoDate = () => new Date().toISOString().slice(0, 10);
  // Postgres day_of_week: 1=Mon, 7=Sun. JS getDay: 0=Sun, 6=Sat. Map.
  const todayDow = () => {
    const js = new Date().getDay();
    return js === 0 ? 7 : js;
  };
  const fmtTime = (t) => {
    // t is "HH:MM:SS" string
    if (!t) return '';
    return t.slice(0, 5);
  };
  function getTimetableStreams() { var c = (window.SCHOOL_CONFIG && window.SCHOOL_CONFIG.classes) || []; return (c && c.length) ? c : ['P1V','P1P','P2V','P2P','P3V','P3P','P4V','P4P','P5V','P5P','P6V','P6P','P7V','P7P']; }
  const STREAMS = getTimetableStreams();

  async function loadTimetable(tenantId) {
    const sb = window.NextSession?.sb;
    if (!sb) return { error: 'No session' };
    const today = isoDate();
    const dow = todayDow();

    // Today's slots, joined with teacher name
    const { data: slots } = await sb
      .from('timetable_slots')
      .select('id, period, start_time, end_time, stream, subject, teacher_id, label')
      .eq('tenant_id', tenantId)
      .eq('day_of_week', dow)
      .order('period', { ascending: true });

    const { data: teachers } = await sb
      .from('teachers')
      .select('id, full_name')
      .eq('tenant_id', tenantId);

    // Today's check-ins (latest per teacher)
    const { data: checkins } = await sb
      .from('teacher_checkins')
      .select('teacher_id, checked_in_at, checked_out_at')
      .eq('tenant_id', tenantId)
      .gte('checked_in_at', today + 'T00:00:00');

    // Today's roll call records
    const { data: rollCalls } = await sb
      .from('student_roll_call')
      .select('teacher_id, stream')
      .eq('tenant_id', tenantId)
      .eq('roll_date', today);

    return {
      slots: slots || [],
      teachers: teachers || [],
      checkins: checkins || [],
      rollCalls: rollCalls || [],
    };
  }

  // Compute slot status given current time + activity
  function computeSlotStatus(slot, ctx) {
    const { now, checkinByTeacher, rollDoneFor } = ctx;

    // Unassigned slot → gray
    if (!slot.teacher_id) return { status: 'free', label: 'UNASSIGNED' };

    // Parse slot times into today's date for comparison
    const [sh, sm] = slot.start_time.split(':').map(Number);
    const [eh, em] = slot.end_time.split(':').map(Number);
    const start = new Date(now); start.setHours(sh, sm, 0, 0);
    const end   = new Date(now); end.setHours(eh, em, 0, 0);

    const teacherIn = checkinByTeacher[slot.teacher_id];
    const rollKey = slot.teacher_id + '|' + slot.stream;
    const rollTaken = rollDoneFor[rollKey];

    const isCurrent  = now >= start && now < end;
    const isPast     = now >= end;
    const isFuture   = now < start;

    if (rollTaken) {
      // Roll has been taken — green regardless of time
      return { status: 'green', label: isCurrent ? 'IN SESSION' : 'DONE' };
    }

    if (isFuture) {
      // Pending — assigned class scheduled later today
      return { status: 'orange', label: 'PENDING' };
    }

    if (isCurrent) {
      if (!teacherIn) return { status: 'red', label: 'TEACHER NOT IN' };
      // Teacher checked in, but no roll yet
      return { status: 'orange', label: 'NO ROLL YET' };
    }

    // Past
    if (!teacherIn)  return { status: 'red', label: 'MISSED · NO TEACHER' };
    return { status: 'red', label: 'MISSED · NO ROLL' };
  }

  const STATUS_TOKENS = {
    green:  { bg: 'rgba(0,252,143,0.16)',  border: 'rgba(0,252,143,0.4)',  fg: '#00FC8F', glow: '0 0 12px rgba(0,252,143,0.25)' },
    orange: { bg: 'rgba(255,180,0,0.16)',  border: 'rgba(255,180,0,0.4)',  fg: '#FFB400', glow: 'none' },
    red:    { bg: 'rgba(255,71,87,0.16)',  border: 'rgba(255,71,87,0.4)',  fg: '#FF4757', glow: '0 0 12px rgba(255,71,87,0.2)' },
    free:   { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.06)', fg: 'rgba(245,246,250,0.30)', glow: 'none' },
    gray:   { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.20)', fg: 'rgba(245,246,250,0.55)', glow: 'none' },
  };

  function HeadTimetablePanel() {
    const profile = window.PEAK_ROLE ? window.PEAK_ROLE.getProfile() : { tenantId: 'peak-primary' };
    const [data, setData] = useState({ loading: true });
    const [now, setNow] = useState(new Date());

    const refresh = useCallback(async () => {
      setData(d => ({ ...d, loading: true }));
      const r = await loadTimetable(profile.tenantId);
      setData(Object.assign({}, r, { loading: false }));
    }, [profile.tenantId]);

    useEffect(() => {
      refresh();
      const dataPoll = setInterval(refresh, 30000); // live data every 30s
      const clockTick = setInterval(() => setNow(new Date()), 60000); // tick minute
      return () => { clearInterval(dataPoll); clearInterval(clockTick); };
    }, [refresh]);

    // Build context for status compute
    const ctx = useMemo(() => {
      const checkinByTeacher = {};
      (data.checkins || []).forEach(c => {
        // Teacher is "in" if checked in AND not checked out
        if (!checkinByTeacher[c.teacher_id] || !c.checked_out_at) {
          checkinByTeacher[c.teacher_id] = !c.checked_out_at;
        }
      });
      const rollDoneFor = {};
      (data.rollCalls || []).forEach(r => {
        rollDoneFor[r.teacher_id + '|' + r.stream] = true;
      });
      const teacherById = {};
      (data.teachers || []).forEach(t => { teacherById[t.id] = t.full_name; });
      return { now, checkinByTeacher, rollDoneFor, teacherById };
    }, [data, now]);

    // Build matrix: periods (rows) × streams (cols)
    const matrix = useMemo(() => {
      const byPeriod = {};
      (data.slots || []).forEach(s => {
        if (!byPeriod[s.period]) byPeriod[s.period] = { period: s.period, start_time: s.start_time, end_time: s.end_time, slots: {} };
        byPeriod[s.period].slots[s.stream] = s;
      });
      return Object.values(byPeriod).sort((a, b) => a.period - b.period);
    }, [data]);

    // Stats across all of today's slots
    const stats = useMemo(() => {
      const c = { green: 0, orange: 0, red: 0, free: 0, gray: 0 };
      (data.slots || []).forEach(s => {
        const st = computeSlotStatus(s, ctx);
        c[st.status] = (c[st.status] || 0) + 1;
      });
      return c;
    }, [data, ctx]);

    return (
      <div style={{
        minHeight: '100vh', background: T.bg, color: T.ink,
        fontFamily: T.font, padding: '32px 36px 60px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10.5, fontFamily: T.mono, letterSpacing: 1.5, color: T.ink3 }}>
              TIMETABLE · {now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} · {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <h1 style={{
              fontSize: 32, fontWeight: 400, margin: '6px 0 0',
              fontFamily: T.serif, letterSpacing: '-0.01em',
            }}>Today's classes — live</h1>
          </div>
          <button onClick={refresh} disabled={data.loading} style={{
            background: 'transparent', color: T.ink2,
            border: '1px solid ' + T.borderStr,
            padding: '8px 16px', borderRadius: 8,
            fontSize: 12, cursor: data.loading ? 'wait' : 'pointer', fontFamily: T.font,
          }}>{data.loading ? 'Refreshing…' : '↻ Refresh'}</button>
        </div>

        {/* Legend + stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12, marginBottom: 24,
        }}>
          {[
            { key: 'green',  label: 'IN SESSION / DONE', count: stats.green },
            { key: 'orange', label: 'PENDING / IN PROGRESS', count: stats.orange },
            { key: 'red',    label: 'NEEDS ATTENTION',   count: stats.red },
            { key: 'free',   label: 'OPEN SLOTS',        count: stats.free },
          ].map(s => {
            const tk = STATUS_TOKENS[s.key];
            return (
              <div key={s.key} style={{
                background: tk.bg, border: '1px solid ' + tk.border,
                borderRadius: 12, padding: 14,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 999, background: tk.fg,
                  boxShadow: tk.glow,
                }} />
                <div>
                  <div style={{ fontSize: 9.5, fontFamily: T.mono, letterSpacing: 1, color: T.ink3 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: tk.fg, fontFamily: T.serif }}>{s.count}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* The grid */}
        {data.loading && matrix.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: T.ink3, fontFamily: T.mono, fontSize: 11 }}>
            LOADING TIMETABLE…
          </div>
        ) : matrix.length === 0 ? (
          <div style={{
            padding: 48, textAlign: 'center', color: T.ink4, fontStyle: 'italic',
            background: T.surface, border: '1px solid ' + T.border, borderRadius: 12,
          }}>
            No timetable seeded yet. Run the timetable schema SQL to populate today's slots.
          </div>
        ) : (
          <div style={{
            background: T.surface, border: '1px solid ' + T.border,
            borderRadius: 12, overflow: 'auto',
          }}>
            <table style={{
              width: '100%', borderCollapse: 'separate', borderSpacing: 0,
              minWidth: 1100,
            }}>
              <thead>
                <tr>
                  <th style={{
                    position: 'sticky', left: 0, zIndex: 2,
                    padding: '14px 12px', background: T.surface2,
                    fontSize: 10, fontFamily: T.mono, letterSpacing: 1.2,
                    color: T.ink3, textAlign: 'left', width: 110,
                    borderBottom: '1px solid ' + T.border,
                  }}>PERIOD</th>
                  {getTimetableStreams().map(s => (
                    <th key={s} style={{
                      padding: '14px 6px', background: T.surface2,
                      fontSize: 10.5, fontFamily: T.mono, letterSpacing: 1,
                      color: T.ink3, fontWeight: 700,
                      borderBottom: '1px solid ' + T.border,
                      borderLeft: '1px solid ' + T.border,
                      minWidth: 64,
                    }}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map(row => {
                  // Is this period current?
                  const [sh, sm] = row.start_time.split(':').map(Number);
                  const [eh, em] = row.end_time.split(':').map(Number);
                  const start = new Date(now); start.setHours(sh, sm, 0, 0);
                  const end   = new Date(now); end.setHours(eh, em, 0, 0);
                  const isCurrent = now >= start && now < end;
                  return (
                    <tr key={row.period}>
                      <td style={{
                        position: 'sticky', left: 0, zIndex: 1,
                        padding: '10px 12px', background: isCurrent ? 'rgba(0,252,143,0.06)' : T.surface,
                        borderBottom: '1px solid ' + T.border,
                        fontSize: 12,
                      }}>
                        <div style={{ fontWeight: 700, color: isCurrent ? T.green : T.ink }}>
                          P{row.period}
                          {isCurrent && <span style={{ marginLeft: 6, fontSize: 9, color: T.green, fontFamily: T.mono }}>● NOW</span>}
                        </div>
                        <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, marginTop: 2 }}>
                          {fmtTime(row.start_time)}–{fmtTime(row.end_time)}
                        </div>
                      </td>
                      {STREAMS.map(stream => {
                        const slot = row.slots[stream];
                        if (!slot) {
                          // No slot defined → free
                          const tk = STATUS_TOKENS.free;
                          return (
                            <td key={stream} style={{
                              padding: 4, borderBottom: '1px solid ' + T.border, borderLeft: '1px solid ' + T.border,
                              verticalAlign: 'top',
                            }}>
                              <div style={{
                                background: tk.bg, border: '1px solid ' + tk.border,
                                borderRadius: 6, padding: '8px 6px', textAlign: 'center',
                                color: tk.fg, fontSize: 9, fontFamily: T.mono, letterSpacing: 0.4,
                                minHeight: 50,
                              }}>—</div>
                            </td>
                          );
                        }
                        const st = computeSlotStatus(slot, ctx);
                        const tk = STATUS_TOKENS[st.status];
                        const teacherName = slot.teacher_id ? ctx.teacherById[slot.teacher_id] : null;
                        return (
                          <td key={stream} style={{
                            padding: 4, borderBottom: '1px solid ' + T.border, borderLeft: '1px solid ' + T.border,
                            verticalAlign: 'top',
                          }}>
                            <div
                              title={teacherName ? `${slot.subject} · ${teacherName}` : slot.subject}
                              style={{
                                background: tk.bg,
                                border: '1px solid ' + tk.border,
                                borderRadius: 6, padding: '8px 6px',
                                boxShadow: tk.glow,
                                minHeight: 50,
                              }}
                            >
                              <div style={{
                                fontSize: 10.5, fontWeight: 700, color: tk.fg,
                                fontFamily: T.mono, letterSpacing: 0.5,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>{slot.subject.slice(0, 7).toUpperCase()}</div>
                              {teacherName && (
                                <div style={{
                                  fontSize: 9.5, color: T.ink3, marginTop: 2,
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>{teacherName.split(' ')[0]}</div>
                              )}
                              <div style={{
                                fontSize: 8.5, fontFamily: T.mono, color: tk.fg,
                                marginTop: 2, letterSpacing: 0.3,
                              }}>{st.label}</div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{
          marginTop: 16, fontSize: 10.5, fontFamily: T.mono, color: T.ink4,
          textAlign: 'right', letterSpacing: 0.6,
        }}>LIVE · UPDATES EVERY 30s · CLOCK TICKS EVERY MINUTE</div>
      </div>
    );
  }

  window.HeadTimetablePanel = HeadTimetablePanel;
})();

  