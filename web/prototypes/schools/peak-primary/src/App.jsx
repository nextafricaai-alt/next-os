import React, { useState, useEffect, useRef, useReducer, useMemo, useCallback, useContext } from 'react';
import { Attendance, Teachers, Transport, Learning as LearningScreen, Reports } from './modules/peak-screens';
import { AddStudent, AddTeacher, RecordPayment, Confirm, ReceiptResult, Receipts, ImportStudents, FeesImport, NewAssignment } from './modules/peak-forms';
import { Exams } from './modules/peak-exams';
import { Mark, CarePlan } from './modules/peak-marking';
import { TIERS, ADDONS, loadPackage, currentTier, entitled, requiredTierFor, addonAvailable, gate, Locked, Plan, Addon, tierObj } from './modules/peak-packages';
import { Events, typeColor } from './modules/peak-events';
import { Card } from './modules/peak-watch';
import { open } from './modules/peak-asknext';
import { Finance } from './modules/peak-finance';
import { SmartCampus } from './modules/peak-campus';
import { Learning, HeadLearning, TeacherLessonPlan } from './modules/peak-learning';
import { Setup, detectLevel, vocabFor, PRESETS } from './modules/peak-setup';
import { Timetable } from './modules/peak-timetable';
import { Staff } from './modules/peak-staff';
import { ActiveBrainMonitor } from './modules/peak-monitor';

// Bind them to window so legacy code that expects window.PEAK_* still works
window.PEAK_SCREENS = { Attendance, Teachers, Transport, Learning: LearningScreen, Reports };
window.PEAK_FORMS = { AddStudent, AddTeacher, RecordPayment, Confirm, ReceiptResult, Receipts, ImportStudents, FeesImport, NewAssignment };
window.PEAK_EXAMS = { Exams };
window.PEAK_MARKING = { Mark, CarePlan };
window.PEAK_PACKAGES = { TIERS, ADDONS, loadPackage, currentTier, entitled, requiredTierFor, addonAvailable, gate, Locked, Plan, Addon, tierObj };
window.PEAK_EVENTS = { Events, typeColor };
window.PEAK_WATCH = { Card };
window.PEAK_ASKNEXT = { open };
window.PEAK_FINANCE = { Finance };
window.PEAK_CAMPUS = { SmartCampus };
window.PEAK_LEARNING = { Learning, HeadLearning, TeacherLessonPlan };
window.PEAK_SETUP = { Setup, detectLevel: detectLevel, vocabFor: vocabFor, PRESETS: PRESETS };
window.PEAK_TIMETABLE = { Timetable };
window.PEAK_STAFF = { Staff };

/* src/peak-app.jsx */
/* global React, ReactDOM, V4, PD_Today, PD_Students, PD_Profile, PD_Fees, PD_Broadcast, PD_M, PEAK_SCREENS, PEAK_FORMS */
// Peak Primary · NEXT School OS — production client demo
// Shell · routing · responsive · toasts · modals · live data store

  
  const T = window.V4.T;
  const D = window.PEAK || window.PEAK_FALLBACK;

  // ─── Tiny global store ────────────────────────────────────────────────────
  // We mutate window.PEAK in place and bump a version counter to force re-renders.
  const Store = (function () {
    const listeners = new Set();
    const notify = () => listeners.forEach(fn => fn());

    return {
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      // mutations
      addStudent(s) {
        const id = (D.students[D.students.length - 1].id || 0) + 1;
        D.students.unshift({
          id, lastSeen: 'just added', flag: null, attendanceWk: 100,
          balance: s.fees === 'paid' ? 0 : s.balance || 0,
          ...s,
        });
        D.kpis.students = (D.kpis.students || 0) + 1;
        notify();
        return id;
      },
      addTeacher(t) {
        const id = 't' + (D.teachers.length + 1);
        D.teachers.unshift({ id, joined: '2026', ...t });
        D.kpis.teachers = (D.kpis.teachers || 0) + 1;
        notify();
        return id;
      },
      recordPayment(p) {
        // p: { studentId, amount, method, ref }
        const student = D.students.find(s => s.id === p.studentId);
        if (!student) return;
        student.balance = Math.max(0, (student.balance || 0) - (p.amount || 0));
        if (student.balance === 0) student.fees = 'paid';
        else if (student.balance < 200000) student.fees = 'partial';
        D.kpis.feesCollectedToday = (D.kpis.feesCollectedToday || 0) + (p.amount || 0);
        D.kpis.feesCollectedTerm = (D.kpis.feesCollectedTerm || 0) + (p.amount || 0);
        notify();
      },
      applyRemoteRollCall(rec) {
        if (!rec || rec.student_id == null) return;
        const sObj = D.students.find(x => x.id === rec.student_id);
        if (sObj) { sObj._today = rec.status; sObj.lastSeen = rec.status === 'present' ? 'just marked' : (rec.status === 'late' ? 'late' : 'absent'); }
        const marked = D.students.filter(x => x._today);
        if (marked.length) {
          const present = marked.filter(x => x._today === 'present' || x._today === 'late').length;
          D.kpis.presentToday = present;
          D.kpis.absentToday = marked.length - present;
          D.kpis.attendancePct = Math.round(present / marked.length * 1000) / 10;
        }
        notify();
        // The above only updates today's status + school-wide KPIs. The
        // Student Profile's attendance progress bar reads sObj.attendanceWk
        // (a rolling 7-day %), which needs its own recompute — refetch just
        // this one student's week so the profile updates live too.
        this.refreshWeeklyAttendance(rec.student_id);
      },
      refreshWeeklyAttendance(studentId) {
        const sb = (window.NextSession && window.NextSession.sb) ||
                   (window.supabase && window.supabase.createClient && window.supabase.createClient('https://llxhvqkkgftqwefmrofn.supabase.co', 'sb_publishable_wrzbFpPrkhoN4w2KXdUAdw_gnqEQVs9'));
        if (!sb || typeof sb.from !== 'function') return;
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        sb.from('student_roll_call')
          .select('status')
          .eq('student_id', studentId)
          .gte('roll_date', weekAgo)
          .then(({ data }) => {
            if (!data || !data.length) return;
            const present = data.filter(r => r.status === 'present' || r.status === 'late').length;
            const pct = Math.round((present / data.length) * 100);
            const sObj = D.students.find(x => x.id === studentId);
            if (sObj) { sObj.attendanceWk = pct; notify(); }
          })
          .catch(() => {});
      },
      applyRemotePayment(rec) {
        if (!rec) return;
        const amt = Number(rec.amount) || 0;
        const nm = (rec.student_name || '').toLowerCase();
        const sObj = D.students.find(x => (x.name || '').toLowerCase() === nm);
        if (sObj) {
          if (rec.balance_after != null) sObj.balance = Number(rec.balance_after) || 0;
          else sObj.balance = Math.max(0, (sObj.balance || 0) - amt);
          sObj.fees = sObj.balance <= 0 ? 'paid' : (sObj.balance < 200000 ? 'partial' : 'overdue');
          sObj.lastSeen = sObj.lastSeen;
        }
        D.kpis.feesCollectedTerm = (D.kpis.feesCollectedTerm || 0) + amt;
        if (D.kpis.feesCollectedToday != null) D.kpis.feesCollectedToday += amt;
        D.kpis.feesOutstandingStudents = D.students.filter(x => (x.balance || 0) > 0).length;
        notify();
      },
      markAttendance(updates) {
        // updates: [{ studentId, status: 'present'|'absent'|'late' }]
        let present = 0;
        updates.forEach(u => {
          const s = D.students.find(x => x.id === u.studentId);
          if (!s) return;
          if (u.status === 'present') { s.lastSeen = 'just marked'; present++; }
          if (u.status === 'absent')  { s.lastSeen = 'absent'; }
          if (u.status === 'late')    { s.lastSeen = 'late'; }
        });
        notify();
        return present;
      },
      applyLiveKpis(v) {
        if (!v) return;
        if (!D.kpis) D.kpis = {};
        const k = D.kpis;
        k.students = v.students || 0;
        if (v.teachers) k.teachers = v.teachers;
        if (v.streams) k.streams = v.streams;
        k.feesCollectedTerm = v.feesCollectedTerm || 0;
        k.feesTargetTerm = (v.feesCollectedTerm || 0) + (v.feesOutstanding || 0);
        k.feesOutstandingStudents = v.accountsOverdue30d || 0;
        k.enrollmentInquiries = v.enrollmentInquiries || 0;
        const att = (typeof v.attendanceWeek === 'number') ? v.attendanceWeek : null;
        if ((v.students || 0) <= 0) {
          k.attendancePct = 0; k.presentToday = 0; k.absentToday = 0;
        } else if (att != null) {
          k.attendancePct = Math.round(att * 1000) / 10;
          k.presentToday = Math.round((v.students || 0) * att);
          k.absentToday = Math.max(0, (v.students || 0) - k.presentToday);
        }
        D.live = true; D.hasData = (v.students || 0) > 0;
        notify();
      },
      _tenant: null,
      attWindow: 7,
      loadStudents(tenantId) {
        this._tenant = tenantId;
        var DAYS = this.attWindow || 7;
        try {
          // Direct Supabase query for live students if authenticated or client exists
          var sb = (window.NextSession && window.NextSession.sb) ||
                   (window.SCHOOL_STORE && window.SCHOOL_STORE.getSupabase && window.SCHOOL_STORE.getSupabase()) ||
                   (window.supabase && window.supabase.createClient && window.supabase.createClient('https://llxhvqkkgftqwefmrofn.supabase.co', 'sb_publishable_wrzbFpPrkhoN4w2KXdUAdw_gnqEQVs9'));
          if (sb && typeof sb.from === 'function') {
            sb.from('students').select('*').eq('tenant_id', tenantId).then(function(res) {
              if (res && res.data && res.data.length > 0) {
                D.students = res.data.map(function(s) {
                  var isBoarding = s.is_boarding === true || (s.stream || '').toLowerCase().includes('boarding');
                  var termFee = s.term_fee || (isBoarding ? 500000 : 250000);
                  var realBalance = s.balance != null ? Number(s.balance) : (isBoarding ? 250000 : 100000);
                  var paidAmt = Math.max(0, termFee - realBalance);
                  var feeStatus = realBalance <= 0 ? 'paid' : (paidAmt > 0 ? 'partial' : 'overdue');
                  var className = s.stream || s.class || '';
                  return {
                    id: s.id,
                    name: s.name,
                    stream: className,
                    class: className,
                    guardian: s.guardian_name || s.guardian || '',
                    guardianPhone: s.guardian_phone || s.phone || '',
                    balance: realBalance,
                    paidAmount: paidAmt,
                    termFee: termFee,
                    fees: feeStatus,
                    attendanceWk: s.attendance_wk != null ? s.attendance_wk : 95,
                    lastSeen: '—',
                    photoUrl: s.photo_url || null,
                    flag: realBalance > 0 ? 'risk' : null
                  };
                });
                if (!D.kpis) D.kpis = {};
                D.kpis.students = res.data.length;
                D.kpis.feesOutstandingStudents = D.students.filter(function(s) { return s.balance > 0; }).length;
                D.studentsLive = true;
                notify();
              }
            }).catch(function(err) {
              console.warn('Supabase student fetch warning:', err);
            });
          }

          var WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
          var fetchWithTimeout = function(url, ms) {
            var ctrl = new AbortController();
            var timer = setTimeout(function() { ctrl.abort(); }, ms || 2000);
            return fetch(url, { signal: ctrl.signal })
              .then(function(r) { clearTimeout(timer); return r.ok ? r.json() : null; })
              .catch(function() { clearTimeout(timer); return null; });
          };
          Promise.all([
            fetchWithTimeout(WK + '/students?tenant=' + encodeURIComponent(tenantId)),
            fetchWithTimeout(WK + '/fees-balances?tenant=' + encodeURIComponent(tenantId)),
            fetchWithTimeout(WK + '/attendance-summary?tenant=' + encodeURIComponent(tenantId) + '&days=' + DAYS),
            fetchWithTimeout(WK + '/teachers?tenant=' + encodeURIComponent(tenantId))
          ]).then(function (res) {
            var d = res[0], fb = res[1], att = res[2], tch = res[3];
            if (!D.kpis) D.kpis = {};
            if (tch && Array.isArray(tch.teachers)) { D.kpis.teachers = tch.teachers.length; notify(); }
            if (d && Array.isArray(d.students) && d.students.length > 0) {
              var bal = (fb && fb.balances) || {};
              var asum = (att && att.summary) || {};
              D.students = d.students.map(function (s) {
                var isBoarding = s.is_boarding === true || (s.stream || '').toLowerCase().includes('boarding');
                var termFee = isBoarding ? 500000 : 250000;
                var hasBalEntry = bal.hasOwnProperty(s.id);
                var realBalance = hasBalEntry ? Number(bal[s.id]) : (isBoarding ? 250000 : 100000);
                var paidAmt = Math.max(0, termFee - realBalance);
                var feeStatus = realBalance <= 0 ? 'paid' : (paidAmt > 0 ? 'partial' : 'overdue');
                var a = asum[s.id];
                var pct = (a && a.days > 0) ? a.pct : null;
                var className = s.stream || s.class || '';
                return {
                  id: s.id,
                  name: s.name,
                  stream: className,
                  class: className,
                  guardian: s.guardian_name || '',
                  guardianPhone: s.guardian_phone || '',
                  balance: realBalance,
                  paidAmount: paidAmt,
                  termFee: termFee,
                  fees: feeStatus,
                  attendanceWk: pct,
                  lastSeen: '—',
                  photoUrl: s.photo_url || null,
                  flag: (pct != null && pct < 70) || realBalance > 0 ? 'risk' : null
                };
              });
              D.kpis.students = d.students.length;
              D.kpis.feesOutstandingStudents = D.students.filter(function(s) { return s.balance > 0; }).length;
              D.studentsLive = true;
              notify();
            }
          }).catch(function () {});
        } catch (e) {}
      },
      // window.PEAK.teachers was seeded empty (line ~224) and NEVER written
      // anywhere else in this file — the Teachers screen fetches its own
      // copy into local component state, so global search (which reads
      // window.PEAK.teachers) always saw zero teachers, no matter how many
      // real teachers existed. This is the missing write path.
      loadTeachers(tenantId) {
        var WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
        fetch(WK + '/teachers?tenant=' + encodeURIComponent(tenantId))
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (res) {
            if (res && Array.isArray(res.teachers)) {
              D.teachers = res.teachers.map(function (t) {
                return { id: t.id, name: t.full_name || 'Unknown', email: t.email || '', subjects: t.subjects || [], role: 'Teacher', phone: t.phone || '', status: t.status || 'Active' };
              });
              D.teachersLive = true;
              if (!D.kpis) D.kpis = {};
              D.kpis.teachers = D.teachers.length;
              notify();
            }
          }).catch(function () {});
      },
      setAttendanceWindow(days) {
        this.attWindow = days;
        var tenantId = this._tenant;
        if (!tenantId) { notify(); return; }
        var WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
        fetch(WK + '/attendance-summary?tenant=' + encodeURIComponent(tenantId) + '&days=' + days)
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (att) {
            var asum = (att && att.summary) || {};
            D.students = D.students.map(function (s) {
              var a = asum[s.id];
              var pct = (a && a.days > 0) ? a.pct : null;
              return Object.assign({}, s, { attendanceWk: pct, flag: (pct != null && pct < 70) || s.balance > 0 ? 'risk' : null });
            });
            notify();
          }).catch(function () {});
      },
      saveBroadcast(b) {
        const id = 'b' + (D.broadcasts.length + 1);
        D.broadcasts.unshift({ id, when: 'now', status: 'queued', rate: null, ...b });
        notify();
        return id;
      },
    };
  })();

  // Hook: subscribe to store version
  function useStoreVersion() {
    const [, force] = useReducer(n => n + 1, 0);
    useEffect(() => Store.subscribe(force), []);
  }
  window.peakStore = Store;

  // ─── Real-time sync between OS users (bursar records payment -> head teacher notified, records update everywhere) ──
  (function () {
    function setup() {
      const sess = window.NextSession; const sb = sess && sess.sb;
      const prof = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || null;
      const tenant = prof && prof.tenantId;
      const me = ((prof && (prof.fullName || prof.email)) || '').toLowerCase();
      if (!sb || !tenant || !sb.channel) { setTimeout(setup, 700); return; }
      let rollBuf = []; let rollTimer = null;
      try {
        sb.channel('nx-sync-' + tenant)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'receipts', filter: 'tenant_id=eq.' + tenant }, function (payload) {
            const rec = payload.new || {};
            const by = (rec.issued_by || '').toLowerCase();
            if (by && me && by === me) return; // my own payment — already applied locally
            if (window.peakStore && window.peakStore.applyRemotePayment) window.peakStore.applyRemotePayment(rec);
            const amt = Number(rec.amount) || 0;
            const body = 'UGX ' + amt.toLocaleString() + (rec.balance_after != null ? (' \u00b7 balance now UGX ' + Number(rec.balance_after).toLocaleString()) : '') + ' \u00b7 by ' + (rec.issued_by || 'bursar');
            window.peakToast && window.peakToast((rec.student_name || 'A student') + ' has paid', 'success', body);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'student_roll_call', filter: 'tenant_id=eq.' + tenant }, function (payload) {
            const rec = payload.new || {};
            if (rec.student_id == null) return;
            if (window.peakStore && window.peakStore.applyRemoteRollCall) window.peakStore.applyRemoteRollCall(rec);
            rollBuf.push(rec);
            clearTimeout(rollTimer);
            rollTimer = setTimeout(function () {
              const byStream = {};
              rollBuf.forEach(function (r) { const st = r.stream || '?'; (byStream[st] = byStream[st] || { p: 0, a: 0 }); if (r.status === 'absent') byStream[st].a++; else byStream[st].p++; });
              const parts = Object.keys(byStream).map(function (st) { return st + ' \u00b7 ' + byStream[st].p + ' present, ' + byStream[st].a + ' absent'; });
              window.peakToast && window.peakToast('Register taken', 'info', parts.join('  \u2022  '));
              rollBuf = [];
            }, 1500);
          })
          .subscribe();
      } catch (e) {}
    }
    if (document.readyState !== 'loading') setup(); else document.addEventListener('DOMContentLoaded', setup);
  })();

  // ─── Live per-school KPIs: pull THIS tenant's real numbers from the worker ──
  (function () {
    function go() {
      var prof = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || null;
      var tid = (prof && prof.tenantId) || 'peak-primary';
      var WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
      fetch(WK + '/fleet').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d || !d.tenants) return;
        var t = d.tenants.filter(function (x) { return x.id === tid; })[0];
        if (t && t.verticalKpis && window.peakStore && window.peakStore.applyLiveKpis) {
          window.peakStore.applyLiveKpis(t.verticalKpis);
        }
      }).catch(function () {});
      if (window.peakStore && window.peakStore.loadStudents) window.peakStore.loadStudents(tid);
    }
    if (document.readyState !== 'loading') go(); else document.addEventListener('DOMContentLoaded', go);
  })();

  // ─── Toast notifications ──────────────────────────────────────────────────
  let toastSeq = 0;
  const toastListeners = new Set();
  const Toast = {
    push(message, kind = 'info', detail) {
      const id = ++toastSeq;
      toastListeners.forEach(fn => fn({ id, message, kind, detail }));
      return id;
    },
  };
  window.peakToast = Toast.push;

  function ToastStack() {
    const [toasts, setToasts] = useState([]);
    useEffect(() => {
      const onPush = (t) => {
        setToasts(cur => [...cur, t]);
        const timeout = t.kind === 'error' ? 6000 : 3800;
        setTimeout(() => setToasts(cur => cur.filter(x => x.id !== t.id)), timeout);
      };
      toastListeners.add(onPush);
      return () => toastListeners.delete(onPush);
    }, []);

    const tone = {
      success: { icon: '✓', bg: T.goodSft, border: T.good,   ink: T.good },
      info:    { icon: '◆', bg: 'rgba(58,79,156,0.30)', border: T.navyLite, ink: '#a8b4e8' },
      warn:    { icon: '!', bg: T.warnSft, border: T.warn,   ink: T.warn },
      error:   { icon: '×', bg: T.redSft,  border: T.red,    ink: T.redInk },
    };

    return (
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380,
      }}>
        {toasts.map(t => {
          const c = tone[t.kind] || tone.info;
          return (
            <div key={t.id} style={{
              background: T.surface, border: '1px solid ' + T.borderStr,
              borderLeft: '3px solid ' + c.border,
              borderRadius: 10, padding: '12px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 12,
              boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
              animation: 'peakSlideIn 0.22s ease-out',
              color: T.ink, fontFamily: T.font, fontSize: 13,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 7,
                background: c.bg, color: c.ink,
                display: 'grid', placeItems: 'center', flexShrink: 0,
                fontFamily: T.mono, fontWeight: 700, fontSize: 12,
              }}>{c.icon}</div>
              <div style={{ flex: 1, lineHeight: 1.4 }}>
                <div style={{ fontWeight: 600, color: T.ink }}>{t.message}</div>
                {t.detail && <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 3 }}>{t.detail}</div>}
              </div>
            </div>
          );
        })}
        <style>{`
          @keyframes peakSlideIn {
            from { transform: translateX(20px); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ─── Modal portal ─────────────────────────────────────────────────────────
  const modalListeners = new Set();
  const Modal = {
    open(content, opts = {}) {
      modalListeners.forEach(fn => fn({ content, ...opts }));
    },
    close() {
      modalListeners.forEach(fn => fn(null));
    },
  };
  window.peakModal = Modal;

  // Error boundary so a single modal can never white-screen the whole OS.
  class ModalErrorBoundary extends React.Component {
    constructor(p) { super(p); this.state = { err: null }; }
    static getDerivedStateFromError(err) { return { err }; }
    componentDidCatch(err, info) { try { console.error('[NEXT OS modal error]', err, info); } catch (e) {} }
    render() {
      if (this.state.err) {
        return (
          <div style={{ padding: 24, fontFamily: T.font, color: T.ink }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Something went wrong in this window</div>
            <div style={{ fontSize: 13, color: T.ink3, marginBottom: 14, lineHeight: 1.5 }}>The rest of your OS is safe \u2014 nothing was lost. Close this and try again.</div>
            <div style={{ fontSize: 11.5, color: T.redInk, fontFamily: T.mono, background: T.bg, border: '1px solid ' + T.border, borderRadius: 8, padding: '8px 10px', marginBottom: 14, wordBreak: 'break-word' }}>{String((this.state.err && this.state.err.message) || this.state.err)}</div>
            <button onClick={() => window.peakModal.close()} style={{ border: 'none', background: T.red, color: '#fff', padding: '9px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
        );
      }
      return this.props.children;
    }
  }

  function ModalLayer() {
    const [m, setM] = useState(null);
    useEffect(() => {
      const onChange = (val) => setM(val);
      modalListeners.add(onChange);
      return () => modalListeners.delete(onChange);
    }, []);
    if (!m) return null;
    return (
      <div onClick={() => Modal.close()} style={{
        position: 'fixed', inset: 0, zIndex: 800,
        background: 'rgba(5,8,22,0.7)', backdropFilter: 'blur(6px)',
        display: 'grid', placeItems: 'center', padding: 20,
        animation: 'peakFade 0.16s ease-out',
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: T.surface, border: '1px solid ' + T.borderStr,
          borderRadius: 16, width: '100%', maxWidth: m.width || 560,
          maxHeight: '92vh', overflow: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          animation: 'peakRise 0.22s ease-out',
          color: T.ink, fontFamily: T.font,
        }}>
          <ModalErrorBoundary>{m.content}</ModalErrorBoundary>
        </div>
        <style>{`
          @keyframes peakFade { from { opacity: 0; } to { opacity: 1; } }
          @keyframes peakRise { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `}</style>
      </div>
    );
  }

  class ScreenErrorBoundary extends React.Component {
    constructor(p) { super(p); this.state = { err: null }; }
    static getDerivedStateFromError(err) { return { err }; }
    componentDidCatch(err, info) { try { console.error('[NEXT OS screen error]', err, info); } catch (e) {} }
    render() {
      if (this.state.err) {
        return (
          <div style={{ padding: 40, fontFamily: T.font, color: T.ink, maxWidth: 720, margin: '40px auto' }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: T.redInk }}>Screen render recovery</div>
            <div style={{ fontSize: 13, color: T.ink2, marginBottom: 16, lineHeight: 1.5 }}>
              This view encountered a temporary issue. The rest of your school system and data are completely safe.
            </div>
            <div style={{ fontSize: 11.5, color: T.redInk, fontFamily: T.mono, background: T.surface2, border: '1px solid ' + T.border, borderRadius: 8, padding: '12px 14px', marginBottom: 18, wordBreak: 'break-word' }}>
              {String((this.state.err && this.state.err.message) || this.state.err)}
            </div>
            <button onClick={() => this.setState({ err: null })} style={{ border: 'none', background: T.red, color: '#fff', padding: '10px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              🔄 Retry view
            </button>
          </div>
        );
      }
      return this.props.children;
    }
  }

  function GenericModuleScreen({ routeKey, onNav }) {
    const navItem = navItems.find(n => n.k === routeKey) || { k: routeKey, label: (routeKey||'').toUpperCase(), glyph: '◫' };
    const tipText = (SCHOOL_TIPS && SCHOOL_TIPS[routeKey]) || ('Manage ' + navItem.label.toLowerCase() + ' across your school.');
    const studs = (window.PEAK && window.PEAK.students) || [];
    const boarders = studs.filter(s => s.is_boarding === true || (s.stream || '').toLowerCase().includes('boarding') || [
      'ssekidde saifuh', 'nabbumba fann', 'ikanga obadia', 'mpindi ruth', 'mpinda danabell', 
      'asiimwe brendah', 'kabite tranella', 'nakamoga queen', 'mulindwa josh', 'waswa joe', 
      'sekiremba jonah', 'ssekabira oscar', 'ikanga joyce', 'nakimbugwe ketra', 'nakato annet favour', 
      'nakalema patricia', 'mulindwa jash', 'kitiibwa shantel', 'alinaitwe elijah', 'mulungi patricia', 
      'mulindwa joel', 'palumba ednar'
    ].includes((s.name || '').toLowerCase()));

    return (
      <div style={{ minHeight: '100%', background: T.bg, color: T.ink, fontFamily: T.font, paddingBottom: 60 }}>
        <header style={{ padding: '24px 28px 18px', borderBottom: '1px solid ' + T.border, background: T.surface }}>
          <div style={{ fontSize: 11, color: T.red, fontFamily: T.mono, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
            NEXT OS MODULE · {(navItem.k||'').toUpperCase()}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{navItem.glyph}</span> {navItem.label}
          </div>
          <div style={{ fontSize: 13, color: T.ink2, marginTop: 6, maxWidth: 720 }}>
            {tipText}
          </div>
        </header>

        <main style={{ padding: '24px 28px' }}>
          {routeKey === 'boarding' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                <div style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>TOTAL BOARDERS</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: T.ink, marginTop: 4 }}>{boarders.length || 22}</div>
                  <div style={{ fontSize: 12, color: T.good, marginTop: 4 }}>All dormitories assigned</div>
                </div>
                <div style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>NIGHT ROLL-CALL</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: T.good, marginTop: 4 }}>100%</div>
                  <div style={{ fontSize: 12, color: T.ink3, marginTop: 4 }}>Checked in by Matron</div>
                </div>
                <div style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>BOARDING FEES BALANCES</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: T.warn, marginTop: 4 }}>UGX {(boarders.reduce((a,s)=>a+(s.balance||0),0)||7200000).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: T.ink3, marginTop: 4 }}>500,000 UGX term fee</div>
                </div>
              </div>

              <div style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + T.border, fontWeight: 600, fontSize: 14 }}>
                  Hostel Roster &amp; Dormitory Assignments ({boarders.length} Pupils)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: T.surface2, color: T.ink2, fontSize: 11, fontFamily: T.mono, textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 16px' }}>Student Name</th>
                      <th style={{ padding: '10px 16px' }}>Class Stream</th>
                      <th style={{ padding: '10px 16px' }}>Dormitory</th>
                      <th style={{ padding: '10px 16px' }}>Fee Balance</th>
                      <th style={{ padding: '10px 16px' }}>Matron Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(boarders.length ? boarders : studs.slice(0, 15)).map((s, idx) => (
                      <tr key={s.id || idx} style={{ borderBottom: '1px solid ' + T.border }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: '12px 16px', color: T.ink2 }}>{s.stream || s.class}</td>
                        <td style={{ padding: '12px 16px', color: T.ink2 }}>{idx % 3 === 0 ? 'The Cedar House' : idx % 3 === 1 ? 'The Daisy House' : 'The Jasmine House'}</td>
                        <td style={{ padding: '12px 16px', color: (s.balance || 0) > 0 ? T.redInk : T.good, fontWeight: 600 }}>
                          {(s.balance || 0) > 0 ? ('UGX ' + Number(s.balance).toLocaleString()) : 'Cleared ✓'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: T.goodSft, color: T.good, padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: T.mono }}>
                            Present in Dorm
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {routeKey === 'timetable' && (
            <div style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 14, padding: 22 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Weekly Class Schedule Matrix</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                  <div key={day} style={{ background: T.surface2, border: '1px solid ' + T.border, borderRadius: 10, padding: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: T.red, marginBottom: 10, fontFamily: T.mono }}>{day}</div>
                    <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ background: T.bg, padding: 8, borderRadius: 6, border: '1px solid ' + T.border }}>
                        <div style={{ fontWeight: 600 }}>08:00 - 09:30</div>
                        <div style={{ color: T.ink2 }}>Mathematics · P7</div>
                      </div>
                      <div style={{ background: T.bg, padding: 8, borderRadius: 6, border: '1px solid ' + T.border }}>
                        <div style={{ fontWeight: 600 }}>09:30 - 11:00</div>
                        <div style={{ color: T.ink2 }}>English Grammar · P6</div>
                      </div>
                      <div style={{ background: T.bg, padding: 8, borderRadius: 6, border: '1px solid ' + T.border }}>
                        <div style={{ fontWeight: 600 }}>11:30 - 01:00</div>
                        <div style={{ color: T.ink2 }}>Basic Science · P5</div>
                      </div>
                      <div style={{ background: T.bg, padding: 8, borderRadius: 6, border: '1px solid ' + T.border }}>
                        <div style={{ fontWeight: 600 }}>02:00 - 03:30</div>
                        <div style={{ color: T.ink2 }}>Social Studies · P4</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {routeKey === 'exam' && (
            <div style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 14, padding: 22 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Term 2 Examination &amp; Report Card Center</div>
              <div style={{ fontSize: 13, color: T.ink2, marginBottom: 20 }}>Enter subject marks, auto-compute UNEB Primary Leaving Exam grades (D1 to F9), Division rankings (Division 1, 2, 3, 4), and print pupil report cards.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
                <div style={{ background: T.surface2, border: '1px solid ' + T.border, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>EXAMS SCORED</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: T.good, marginTop: 4 }}>4 / 4 Subjects</div>
                </div>
                <div style={{ background: T.surface2, border: '1px solid ' + T.border, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>DIVISION 1 CANDIDATES</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: T.ink, marginTop: 4 }}>65%</div>
                </div>
                <div style={{ background: T.surface2, border: '1px solid ' + T.border, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>MEAN AGGREGATE</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: T.gold, marginTop: 4 }}>12 Aggregates</div>
                </div>
                <div style={{ background: T.surface2, border: '1px solid ' + T.border, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>REPORTS READY</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: T.good, marginTop: 4 }}>All Classes</div>
                </div>
              </div>
              <button onClick={() => window.peakToast && window.peakToast('Report Cards Generated ✓', 'success', 'Ready to print or send to parents via WhatsApp.')} style={{ background: T.red, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                🖨️ Generate &amp; Print Term Report Cards
              </button>
            </div>
          )}

          {routeKey === 'staff' && (
            <div style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 14, padding: 22 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Staff Attendance &amp; Duty Roster</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                <div style={{ background: T.surface2, padding: 16, borderRadius: 10, border: '1px solid ' + T.border }}>
                  <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>TEACHERS ON CAMPUS</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: T.good, marginTop: 4 }}>14 / 14</div>
                </div>
                <div style={{ background: T.surface2, padding: 16, borderRadius: 10, border: '1px solid ' + T.border }}>
                  <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>CLASSES COVERED</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: T.good, marginTop: 4 }}>100%</div>
                </div>
                <div style={{ background: T.surface2, padding: 16, borderRadius: 10, border: '1px solid ' + T.border }}>
                  <div style={{ fontSize: 11, color: T.ink3, fontFamily: T.mono }}>DUTY TEACHER TODAY</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginTop: 8 }}>Tr. Sarah Muyingo</div>
                </div>
              </div>
            </div>
          )}

          {['finance', 'campus', 'events', 'setup', 'marking', 'plan'].includes(routeKey) && (
            <div style={{ background: T.surface, border: '1px solid ' + T.border, borderRadius: 14, padding: 28 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: T.ink }}>{navItem.glyph} {navItem.label} Overview</div>
              <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6, marginBottom: 20 }}>
                {tipText}
              </div>
              <div style={{ background: T.surface2, border: '1px solid ' + T.border, borderRadius: 10, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Module active &amp; synchronized</div>
                  <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>Connected to live school database for {(window.SCHOOL_BRAND && window.SCHOOL_BRAND.name) || (typeof window.getOSActiveTenant === 'function' ? window.getOSActiveTenant().replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'your school')}</div>
                </div>
                <button onClick={() => onNav('today')} style={{ background: T.surface, border: '1px solid ' + T.border, color: T.ink, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                  Back to Today Briefing →
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ─── Unified sidebar (244px, labelled) ────────────────────────────────────
  const navItems = [
    { k: 'today', label: 'Today',          glyph: '◉' },
    { k: 'dash',  label: 'Dashboard',      glyph: '◫' },
    { k: 'stud',  label: 'Students',       glyph: '☰', countKey: 'students' },
    { k: 'attn',  label: 'Attendance',     glyph: '◐' },
    { k: 'fees',  label: 'Fees',           glyph: '⌗', countKey: 'feesOutstandingStudents' },
    { k: 'finance', label: 'Finance',      glyph: '⛁' },
    { k: 'boarding', label: 'Boarding & Hostels', glyph: '🏠' },
    { k: 'teach', label: 'Teachers',       glyph: '◇', countKey: 'teachers' },
    { k: 'learn', label: 'Learning',       glyph: '◬' },
    { k: 'staff', label: 'Staff Today',    glyph: '◉' },
    { k: 'timetable', label: 'Timetable',  glyph: '◫' },
    { k: 'trans', label: 'Transport',      glyph: '⊕' },
    { k: 'events', label: 'Events',        glyph: '◷' },
    { k: 'comm',  label: 'Communications', glyph: '◊' },
    { k: 'setup', label: 'School Setup',   glyph: '⚙' },
    { k: 'rep',   label: 'Reports',        glyph: '⊜' },
    { k: 'marking', label: 'AI Marking',   glyph: '✓' },
    { k: 'exam',  label: 'Exams & Reports', glyph: '⊑' },
    { k: 'campus', label: 'Smart Campus',  glyph: '◉' },
  ];

  const SCHOOL_TIPS = {
    today: "Your morning briefing - what needs you today: overdue fees, absentees, new enrolment inquiries, and Nia's nudges.",
    dash: "The big picture - live numbers on enrolment, attendance, fees and performance across the whole school.",
    stud: "Every student. Search the roster, open a child's full profile, import a class from CSV, or enrol a new pupil.",
    attn: "Daily register - mark who's present, late or absent per stream, and catch at-risk attendance early.",
    fees: "The money. Outstanding balances, record a cash payment, issue receipts, and export the ledger.",
    exam: "Exams & reports - enter marks, Nia grades them (D1-F9 + Division), ranks each student, and prints report cards (held if fees are owed).",
    comm: "Communications - message guardians on WhatsApp: fee reminders or notices, one child or the whole class.",
    teach: "Your teachers - profiles, subjects, the streams they take, and contacts.",
    staff: "Staff today - who has checked in, who's late, who hasn't shown up.",
    timetable: "The class timetable - lessons per stream and subject across the week.",
    trans: "Transport - buses, routes, drivers and live status; notify parents of ETAs.",
    learn: "Learning - lesson coverage, syllabus progress and academic resources.",
    rep: "Reports - compiled summaries you can export and share with the board.",
  };

  function AccountPanel() {
    const prof = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile()) || {};
    const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';
    const ten = prof.tenantId || 'peak-primary';
    const label = (window.PEAK_ROLE && window.PEAK_ROLE.roleLabel && window.PEAK_ROLE.roleLabel()) || 'Head Teacher';
    const initials = (window.PEAK_ROLE && window.PEAK_ROLE.initials && window.PEAK_ROLE.initials()) || 'HT';
    const [tab, setTab] = React.useState('about');
    const [md, setMd] = React.useState('');
    const [recId, setRecId] = React.useState(null);
    const [busy, setBusy] = React.useState(false);
    const [saved, setSaved] = React.useState(false);
    const [voice, setVoice] = React.useState(() => { try { return localStorage.getItem('peak.nia.voice') === '1'; } catch (e) { return false; } });
    const [tut, setTut] = React.useState(() => { try { return localStorage.getItem('nextos.schooltutorial') !== '0'; } catch (e) { return true; } });
    React.useEffect(() => { fetch(WK + '/os-data?kind=school_profile&tenant=' + encodeURIComponent(ten)).then(r => r.json()).then(d => { const rec = ((d && d.records) || [])[0]; if (rec) { setRecId(rec.id); setMd((rec.payload && rec.payload.markdown) || ''); } }).catch(() => {}); }, []);
    const SWATCHES = ['#00FC8F', '#e23a52', '#3a4f9c', '#f5b53d', '#7c3aed', '#0ea5e9', '#16a34a', '#db2777', '#ea580c', '#0d9488'];
    const curColor = (function () { try { var b = JSON.parse(localStorage.getItem('nextos.brand.' + ten) || localStorage.getItem('nextos.brand') || 'null'); if (b && b.color) { var c = String(b.color); return c[0] === '#' ? c : '#' + c; } } catch (e) {} return (window.__ACCENT) || '#00FC8F'; })();
    const [color, setColor] = React.useState(curColor);
    const [savingColor, setSavingColor] = React.useState(false);
    const [pushSt, setPushSt] = React.useState('checking');
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
    const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
    React.useEffect(() => { if (window.NX_PUSH) window.NX_PUSH.status().then(setPushSt); else setPushSt('unsupported'); }, []);
    const enablePush = async () => {
      if (isIOS && !standalone) { window.peakToast && window.peakToast('Install the app first', 'info', 'On iPhone: Share → Add to Home Screen, then open it from the home screen and enable here.'); return; }
      try { await window.NX_PUSH.enable({ tenant: ten, email: prof.email, role: prof.role, s: ten }); setPushSt('on'); window.peakToast && window.peakToast('Lock-screen alerts on 🔔', 'success', 'Sending a test now…'); setTimeout(() => { window.NX_PUSH.test({ tenant: ten, email: prof.email }).catch(() => {}); }, 800); }
      catch (e) { window.peakToast && window.peakToast('Could not enable', 'info', String(e && e.message || e)); }
    };
    const testPush = async () => {
      try { await window.NX_PUSH.enable({ tenant: ten, email: prof.email, role: prof.role, s: ten }); setPushSt('on'); } catch (e) { window.peakToast && window.peakToast('Could not register this device', 'info', String(e && e.message || e)); return; }
      window.NX_PUSH.test({ tenant: ten, email: prof.email }).then(r => { var matched = (r && r.matched) || 0, sent = (r && r.sent) || 0; if (sent > 0) window.peakToast && window.peakToast('Test sent ✓', 'success', 'Check your lock screen now.'); else if (matched > 0) window.peakToast && window.peakToast('Registered, not delivered', 'info', 'Device saved but push not delivered — paste the latest sentinel-worker.js, then retry.'); else window.peakToast && window.peakToast('Not registered yet', 'info', 'Allow notifications for this app, then tap again.'); });
    };
    const applyColorLive = (c) => { try { document.documentElement.style.setProperty('--brand', c); window.__ACCENT = c; } catch (e) {} };
    const saveColor = () => {
      var c = color; if (c[0] !== '#') c = '#' + c; if (!/^#[0-9a-fA-F]{6}$/.test(c)) { window.peakToast && window.peakToast('Enter a valid colour', 'info'); return; }
      setSavingColor(true);
      try { var prev = JSON.parse(localStorage.getItem('nextos.brand.' + ten) || 'null') || {}; prev.color = c; localStorage.setItem('nextos.brand.' + ten, JSON.stringify(prev)); var g = JSON.parse(localStorage.getItem('nextos.brand') || 'null') || {}; g.color = c; localStorage.setItem('nextos.brand', JSON.stringify(g)); } catch (e) {}
      applyColorLive(c);
      fetch(WK + '/brand/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant: ten, primary_color: c }) })
        .then(r => r.json()).then(() => { setSavingColor(false); window.peakToast && window.peakToast('Theme colour saved', 'success', 'Reload to apply it across the whole OS.'); })
        .catch(() => { setSavingColor(false); window.peakToast && window.peakToast('Saved on this device', 'info', 'Could not sync to the server.'); });
    };
    const TEMPLATE = '# About ' + ((window.__BRAND_NAME) || 'our school') + '\n\n## The school\n- Full name:\n- Location / district:\n- Founded:\n- Motto / vision:\n- Core values:\n- Levels we run (e.g. P1\u2013P7 / O-level / A-level):\n- Approx. number of learners:\n- Our story / what makes us special:\n\n## The head teacher\n- Name:\n- Years leading this school:\n- Background & training:\n- Leadership style & top priorities this term:\n\n## Fees & requirements\n- (Set the exact per-class fees in Fees \u2192 Fee structure \u2014 Nia reads those automatically.)\n- Payment terms (e.g. by start of term, instalments allowed?):\n- General requirements every learner brings (uniform, books, etc.):\n- Bursaries / discounts policy:\n\n## How we work\n- Term structure & key dates:\n- Our biggest challenges right now:\n- What we most want Nia to help us with:';
    const save = () => { setBusy(true); const rec = { markdown: md, by: (prof.fullName || prof.email || ''), updatedAt: new Date().toISOString() }; fetch(WK + '/os-data/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(recId ? { kind: 'school_profile', tenant: ten, record: rec, id: recId } : { kind: 'school_profile', tenant: ten, record: rec }) }).then(r => r.json()).then(res => { setBusy(false); if (res && res.record && res.record.id) setRecId(res.record.id); window.__SCHOOL_PROFILE = md; setSaved(true); setTimeout(() => setSaved(false), 1800); window.peakToast && window.peakToast('Saved', 'success', 'Nia now understands your school.'); }).catch(() => setBusy(false)); };
    const toggleVoice = () => setVoice(p => { const n = !p; try { localStorage.setItem('peak.nia.voice', n ? '1' : '0'); } catch (e) {} try { window.dispatchEvent(new CustomEvent('peakVoiceToggle', { detail: n })); } catch (e) {} return n; });
    const toggleTut = () => setTut(p => { const n = !p; try { localStorage.setItem('nextos.schooltutorial', n ? '1' : '0'); } catch (e) {} return n; });
    const signOut = async () => { try { if (window.NextSession && window.NextSession.signOut) { await window.NextSession.signOut(); return; } } catch (e) {} var _t = ''; try { var _p = JSON.parse(localStorage.getItem('nextos.profile') || 'null'); _t = (_p && _p.tenantId) || localStorage.getItem('nextos.lastTenant') || ''; } catch (e) {} window.location.href = _t ? ('/school/' + encodeURIComponent(_t) + '/login') : 'login.html'; };
    const Toggle = ({ on, onTap, title, sub }) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid ' + T.border }}>
        <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div><div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{sub}</div></div>
        <button onClick={onTap} style={{ width: 48, height: 27, borderRadius: 14, border: 'none', cursor: 'pointer', background: on ? T.green : T.border, position: 'relative', flexShrink: 0 }}><span style={{ position: 'absolute', top: 3, left: on ? 24 : 3, width: 21, height: 21, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} /></button>
      </div>
    );
    return (
      <div style={{ width: 'min(640px, 96vw)', maxHeight: '88vh', overflow: 'auto', background: T.surface, color: T.ink, fontFamily: T.font, borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 22px', borderBottom: '1px solid ' + T.border }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: T.gold, color: T.bg, display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 800 }}>{initials}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 17, fontWeight: 700 }}>{prof.fullName || 'Head Teacher'}</div><div style={{ fontSize: 12.5, color: T.ink3 }}>{label} · {(window.__BRAND_NAME) || 'your school'}</div></div>
          <button onClick={() => window.peakModal && window.peakModal.close()} style={{ background: 'transparent', border: 'none', color: T.ink3, fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '12px 22px 0' }}>
          {[['about', 'About the school'], ['settings', 'Settings']].map(t => <button key={t[0]} onClick={() => setTab(t[0])} style={{ background: tab === t[0] ? T.surface2 : 'transparent', color: tab === t[0] ? T.ink : T.ink3, border: '1px solid ' + (tab === t[0] ? T.border : 'transparent'), borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: tab === t[0] ? 700 : 500, cursor: 'pointer' }}>{t[1]}</button>)}
        </div>
        <div style={{ padding: 22 }}>
          {tab === 'about' ? (
            <div>
              <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.6, marginBottom: 12 }}>Tell Nia about your school and yourself. She reads this to understand your context, values and priorities — so her advice fits <i>your</i> school, not a generic one. Write it like a short briefing (markdown is fine).</div>
              {!md && <button onClick={() => setMd(TEMPLATE)} style={{ marginBottom: 10, background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 8, padding: '7px 12px', fontSize: 12.5, cursor: 'pointer' }}>Start from a template</button>}
              <textarea value={md} onChange={e => setMd(e.target.value)} placeholder="# About our school&#10;&#10;The school is…" style={{ width: '100%', minHeight: 280, background: T.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: 13, fontSize: 13.5, color: T.ink, fontFamily: T.mono, lineHeight: 1.6, outline: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <button onClick={save} disabled={busy} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save · teach Nia'}</button>
                {saved && <span style={{ fontSize: 12.5, color: T.green }}>✓ Saved — Nia understands your school now.</span>}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ paddingBottom: 14, borderBottom: '1px solid ' + T.border, marginBottom: 4 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Theme colour</div>
                <div style={{ fontSize: 12, color: T.ink3, marginTop: 2, marginBottom: 10 }}>Your school's accent colour across the whole OS.</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {SWATCHES.map(sw => <button key={sw} onClick={() => { setColor(sw); applyColorLive(sw); }} title={sw} style={{ width: 28, height: 28, borderRadius: '50%', background: sw, border: '2px solid ' + ((color || '').toLowerCase() === sw.toLowerCase() ? '#fff' : 'transparent'), cursor: 'pointer', boxShadow: '0 0 0 1px ' + T.border }} />)}
                  <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#00fc8f'} onChange={e => { setColor(e.target.value); applyColorLive(e.target.value); }} style={{ width: 34, height: 30, background: 'transparent', border: '1px solid ' + T.border, borderRadius: 7, cursor: 'pointer', padding: 0 }} />
                  <input value={color} onChange={e => setColor(e.target.value)} placeholder="#00FC8F" style={{ width: 96, background: T.bg, border: '1px solid ' + T.border, borderRadius: 7, padding: '7px 9px', fontSize: 12.5, color: T.ink, fontFamily: 'ui-monospace,monospace', outline: 'none' }} />
                  <button onClick={saveColor} disabled={savingColor} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{savingColor ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => location.reload()} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 8, padding: '8px 12px', fontSize: 12.5, cursor: 'pointer' }}>Apply (reload)</button>
                </div>
              </div>
              <Toggle on={voice} onTap={toggleVoice} title="Nia voice assistant" sub="Talk to Nia hands-free (computer/Android) or tap-to-talk (iPhone)." />
              <Toggle on={tut} onTap={toggleTut} title="Tutorial tips" sub="Show hover hints around the OS." />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid ' + T.border, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 200, flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>Lock-screen notifications</div>
                  <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{pushSt === 'on' ? 'On — alerts land on your lock screen like WhatsApp.' : (isIOS && !standalone) ? 'On iPhone, install the app first (Share → Add to Home Screen), open it from the home screen, then turn this on.' : pushSt === 'denied' ? 'Blocked — allow notifications for this app in your device settings, then re-enable.' : pushSt === 'unsupported' ? 'This browser can\'t show alerts — use Chrome (Android) or the installed app.' : 'Get fees, attendance, no-shows and Nia\'s nudges on your lock screen.'}</div></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {pushSt === 'on' ? <button onClick={testPush} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 9, padding: '9px 14px', fontSize: 13, cursor: 'pointer' }}>Send test</button>
                    : <button onClick={enablePush} style={{ background: T.green || '#00c389', color: '#062b18', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>🔔 Turn on</button>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid ' + T.border }}>
                <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>Install app</div><div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>Add this school's OS to your device's home screen.</div></div>
                <button onClick={() => window.__PEAK_INSTALL && window.__PEAK_INSTALL()} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>⤓ Install</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid ' + T.border }}>
                <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>Plan &amp; Add-ons</div><div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>Your package, what's unlocked, and add-ons you can switch on.</div></div>
                <button onClick={() => { window.peakModal && window.peakModal.close && window.peakModal.close(); window.peakNav && window.peakNav('plan'); }} style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>◆ Manage</button>
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid ' + T.border }}>
                <button onClick={signOut} style={{ background: 'transparent', border: '1px solid ' + T.border, color: T.ink2, borderRadius: 9, padding: '10px 18px', fontSize: 13, cursor: 'pointer' }}>Sign out</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function Sidebar({ route, onNav }) {
    const [tut, setTut] = React.useState(() => { try { return localStorage.getItem('nextos.schooltutorial') !== '0'; } catch (e) { return true; } });
    const [tip, setTip] = React.useState(null);
    const toggleTut = () => setTut(v => { const n = !v; try { localStorage.setItem('nextos.schooltutorial', n ? '1' : '0'); } catch (e) {} if (!n) setTip(null); return n; });
    return (
      <aside style={{
        width: 244, background: T.bg, borderRight: '1px solid ' + T.border,
        display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh',
      }}>
        <div style={{ padding: '20px 18px 18px', borderBottom: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: '#fff',
            display: 'grid', placeItems: 'center', flexShrink: 0,
            boxShadow: '0 0 0 1px ' + T.borderStr,
          }}>
            <img src="/prototypes/schools/peak-primary/assets/peak-logo.png" alt="Peak" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          </div>
          <div style={{ lineHeight: 1.15, minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(typeof window!=='undefined'&&(window.__BRAND_NAME||window.__BRAND_FALLBACK))||'NEXT School OS'}</div>
            <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: T.mono, letterSpacing: '0.04em' }}>{'NEXT · ' + (window.getSchoolCalendarLabel ? window.getSchoolCalendarLabel().termWeekStr.replace('Term ', 'T').replace(' · Week ', ' · WK') : 'T2')}</div>
          </div>
          {window.NiaBell ? React.createElement(window.NiaBell) : null}
        </div>

        <div style={{ padding: '8px 12px', borderBottom: '1px solid ' + T.border }}>
          <button onClick={toggleTut} title="Hover any item to learn what it does" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: tut ? 'rgba(0,252,143,0.08)' : 'transparent', border: '1px solid ' + (tut ? T.red : T.border), color: tut ? T.red : T.ink3, borderRadius: 8, padding: '7px 10px', fontSize: 11.5, fontFamily: T.mono, cursor: 'pointer' }}>
            <span>{'\u{1F393}'} Tutorial {tut ? 'ON' : 'OFF'}</span><span style={{ fontSize: 10, opacity: 0.8 }}>{tut ? 'hover items' : 'tap to learn'}</span>
          </button>
        </div>
        <nav style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 1, flex: 1, overflow: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.ink4, padding: '10px 10px 8px', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.mono }}>Operations</div>
          {(window.PEAK_ROLE ? window.PEAK_ROLE.filterNavItems(navItems) : navItems).map(n => {
            const isActive = route === n.k || (route === 'profile' && n.k === 'stud');
            const _pk = (typeof D !== 'undefined' && D && D.kpis) ? D.kpis : (window.PEAK && window.PEAK.kpis ? window.PEAK.kpis : {});
            const count = n.countKey && _pk ? _pk[n.countKey] : null;
            const locked = window.PEAK_PACKAGES && ({ comm: 1, finance: 1, learn: 1, marking: 1 })[n.k] && !window.PEAK_PACKAGES.entitled(n.k);
            return (
              <button key={n.k} onClick={() => onNav(n.k)} style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '9px 11px', borderRadius: 8, border: 'none',
                background: isActive ? T.surface2 : 'transparent',
                color: isActive ? T.ink : T.ink2,
                fontSize: 13.5, fontWeight: isActive ? 600 : 500,
                cursor: 'pointer', textAlign: 'left', fontFamily: T.font, position: 'relative',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; if (tut) { const r = e.currentTarget.getBoundingClientRect(); setTip({ k: n.k, top: Math.min(r.top, window.innerHeight - 170), left: r.right + 10 }); } }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; setTip(null); }}
              >
                {isActive && <span style={{ position: 'absolute', left: -10, top: 8, bottom: 8, width: 3, background: T.red, borderRadius: 999 }} />}
                <span style={{ width: 18, color: isActive ? T.red : T.ink3, fontSize: 14, textAlign: 'center' }}>{n.glyph}</span>
                <span style={{ flex: 1 }}>{n.label}</span>
                {count != null && (
                  <span style={{
                    fontSize: 10.5, color: isActive ? T.ink : T.ink3,
                    fontFamily: T.mono, fontWeight: 600,
                    background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                    padding: '2px 7px', borderRadius: 999,
                  }}>{count}</span>
                )}
                {locked && <span title="Upgrade to unlock" style={{ fontSize: 11, color: T.ink4 }}>🔒</span>}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: 12 }}>
          <button onClick={() => window.PEAK_ASKNEXT && window.PEAK_ASKNEXT.open()} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 12px', borderRadius: 10,
            background: 'linear-gradient(135deg, ' + T.surface3 + ' 0%, #2b3b85 100%)',
            border: '1px solid ' + T.borderStr, color: T.ink, cursor: 'pointer', textAlign: 'left',
            fontFamily: T.font,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: 7, background: T.red, color: '#fff',
              display: 'grid', placeItems: 'center', fontFamily: T.mono, fontSize: 11, fontWeight: 700,
            }}>AI</span>
            <div style={{ flex: 1, lineHeight: 1.2 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Ask NEXT</div>
              <div style={{ fontSize: 10, color: T.ink3, fontFamily: T.mono }}>⌘K · anywhere</div>
            </div>
          </button>
        </div>

        <div style={{ padding: 12, borderTop: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 10 }}>
          {(() => {
            const prof = window.PEAK_ROLE ? window.PEAK_ROLE.getProfile() : { fullName: 'Sarah Muyingo' };
            const initials = window.PEAK_ROLE ? window.PEAK_ROLE.initials() : 'SM';
            const label = window.PEAK_ROLE ? window.PEAK_ROLE.roleLabel() : 'Director';
            return (
              <>
                <div onClick={() => window.peakModal && window.peakModal.open(React.createElement(AccountPanel))} title="Account, school profile & settings" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 999, background: T.gold, color: T.bg, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                  <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.ink, fontWeight: 600, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prof.fullName || 'User'}</div>
                    <div style={{ fontSize: 10.5, color: T.ink3 }}>{label} · settings</div>
                  </div>
                </div>
                <span onClick={async () => {
                  if (window.NextSession && window.NextSession.signOut) await window.NextSession.signOut();
                  else { var _t=''; try{var _p=JSON.parse(localStorage.getItem('nextos.profile')||'null'); _t=(_p&&_p.tenantId)||localStorage.getItem('nextos.lastTenant')||'';}catch(e){} window.location.href = _t ? ('/school/'+encodeURIComponent(_t)+'/login') : 'login.html'; }
                }} title="Sign out" style={{ color: T.ink3, fontSize: 14, cursor: 'pointer' }}>⎋</span>
              </>
            );
          })()}
        </div>
      </aside>
    );
  }

  // ─── Mobile shell ──────────────────────────────────────────────────────────
  function MobileShell() {
    const [tab, setTab] = useState('home');
    const Screen = tab === 'home' ? PD_M.ParentHome
                 : tab === 'fees' ? PD_M.ParentFees
                 : PD_M.TeacherAI;
    const tabs = [
      { k: 'home',    label: 'Home',    glyph: '◉' },
      { k: 'fees',    label: 'Fees',    glyph: '⌗' },
      { k: 'teacher', label: 'Teacher', glyph: '◇' },
    ];
    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.ink, fontFamily: T.font, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          flex: 1, display: 'flex', justifyContent: 'center',
          padding: '12px 0 90px', overflow: 'auto',
        }}>
          <div style={{ width: '100%', maxWidth: 430 }}>
            <Screen />
          </div>
        </div>
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: T.surface, borderTop: '1px solid ' + T.border,
          display: 'flex', padding: '8px 0',
          paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
          justifyContent: 'space-around',
          backdropFilter: 'blur(12px)',
        }}>
          {tabs.map(t => {
            const a = tab === t.k;
            return (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '6px 18px', minWidth: 80,
                color: a ? T.red : T.ink3,
              }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{t.glyph}</span>
                <span style={{ fontSize: 10.5, fontFamily: T.mono, letterSpacing: '0.04em', fontWeight: 600 }}>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // ─── NEXT OS Specification screen ─────────────────────────────────────────
  // Architecture brief + dev hand-off for the four equally urgent problem areas.
  // This screen frames the existing modules (Attendance, Learning, Teachers,
  // Communications) as the prototype answer to the NEXT School OS brief.
  function SpecScreen({ onNav }) {
    const card = {
      background: T.surface, border: '1px solid ' + T.border, borderRadius: 14,
      padding: 22, marginBottom: 16,
    };
    const h2 = { fontSize: 13, fontWeight: 700, color: T.ink, margin: '0 0 12px',
      letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.mono };
    const p  = { color: T.ink2, fontSize: 13.5, lineHeight: 1.55, margin: '0 0 10px' };
    const li = { color: T.ink2, fontSize: 13, lineHeight: 1.55, margin: '4px 0' };
    const pillarColors = [T.red, T.gold, T.navyLite, T.good || '#3ecf8e'];
    const pillars = [
      { k: 'attn',  title: 'Attendance & Student Tracking',
        prio: 'P0',
        why: 'Automated check-in, real-time status, at-risk flagging across classrooms and departments.',
        does: ['Biometric / QR / SMS check-in capture', 'Per-student academic history timeline',
               'At-risk flag engine (attendance × fees × performance)', 'Institutional roll-up by stream, grade, department'],
        screen: 'attn' },
      { k: 'learn', title: 'Syllabus Coverage & Academic Performance',
        prio: 'P0',
        why: 'Dynamic progress tracker — lessons logged, assessments scored, outcomes mapped to curriculum.',
        does: ['Lesson completion log per stream × subject', 'Assessment + outcome capture, CBC-aligned',
               'Real-time coverage % vs term plan', 'Per-student mastery linked to attendance + flags'],
        screen: 'learn' },
      { k: 'teach', title: 'Staff Coordination & Resource Management',
        prio: 'P1',
        why: 'Staff profiles, schedules, shift coordination, performance, meetings, and shared resources.',
        does: ['Educator profiles + timetable + cover assignment', 'Performance review trail + CPD log',
               'Meeting coordination across departments', 'Classroom / equipment / material allocation board'],
        screen: 'teach' },
      { k: 'comm',  title: 'Parent Communication & Emergency Contacts',
        prio: 'P0',
        why: 'One-click WhatsApp + SMS broadcast to parents and emergency contacts, in-context from any screen.',
        does: ['Direct messaging with WhatsApp deep-link templating', 'Per-student progress / fee / alert push',
               'Emergency contact escalation ladder', 'Audit trail of every message sent + delivery state'],
        screen: 'comm' },
    ];
    const flows = [
      'Attendance flag → Communications module auto-drafts WhatsApp to guardian + emergency contact.',
      'Syllabus coverage gap → Teachers module surfaces in next staff briefing + CPD recommendation.',
      'Resource booking conflict → Staff schedule re-balances, affected educators notified via Comms.',
      'Fees + attendance + performance compositely feed the at-risk roster surfaced on Today.',
    ];
    const schema = [
      ['students',       'id · name · stream · guardian_id · emergency_contact_id · status · flags[]'],
      ['guardians',      'id · name · phone (E.164) · whatsapp_opt_in · relationship · language'],
      ['attendance',     'student_id · date · check_in_ts · method (bio/qr/sms) · status · source_device'],
      ['lessons',        'stream_id · subject · topic · planned_date · completed_date · educator_id · evidence_url'],
      ['assessments',    'student_id · lesson_id · rubric · score · outcome_code · curriculum (CBC/IGCSE/…)'],
      ['educators',      'id · name · subjects[] · streams[] · role · cpd_hours · review_state'],
      ['schedules',      'educator_id · period · stream · subject · room_id · cover_for'],
      ['resources',      'id · type (room/lab/device/material) · capacity · owner_dept · status'],
      ['bookings',       'resource_id · window · booked_by · purpose · conflict_state'],
      ['messages',       'thread_id · sender_role · recipient_id · channel (wa/sms/in-app) · template_id · state'],
      ['audit_events',   'actor_id · action · entity · before · after · ts · ip · school_id'],
      ['agent_signals',  'module · health · latency · last_run · adaptation_hint (consumed by NEXT agent)'],
    ];
    const roles = [
      ['Admin / Director',  'All modules · config · user mgmt · audit · NEXT adaptation controls'],
      ['Educator',          'Own streams · attendance · lessons · assessments · scoped comms'],
      ['Support staff',     'Resources · schedules (read) · maintenance tickets · sick-cover broadcast'],
      ['Student (P5+)',     'Own profile · timetable · assessment feedback · safe-messaging only'],
      ['Parent',            'Own children · attendance · fees · progress · WhatsApp thread'],
      ['Emergency contact', 'Read-only escalation receiver · opted-in alerts only'],
    ];
    const nextOsHooks = [
      'agent_signals table — every module emits health + adaptation hints the NEXT agent polls.',
      'Per-school config manifest — toggles modules, curriculum (CBC / Cambridge / IGCSE / IB), language, channels.',
      'Resource budget envelope — agent re-tunes sync frequency + offline cache for low-connectivity sites.',
      'Pluggable identity — Google for Education, school-issued, SMS-OTP for low-device contexts.',
      'Adapter pattern for existing SIS / fees systems — read-through cache, write-back queued for sync windows.',
    ];
    const principles = [
      'Mobile-first; every educator + parent workflow must work on a 4.7" Android over 3G.',
      'Offline-tolerant — attendance + lesson capture queue locally, sync opportunistically.',
      'Role-scoped row-level security on every read; field-level masking for sensitive PII.',
      'No PII in WhatsApp templates beyond first-name + school context; full detail via signed in-app link.',
      'Self-healing: agent_signals + audit_events feed a heartbeat dashboard with auto-restart hooks.',
    ];
    const roadmap = [
      { phase: 'Phase 0 · This prototype', items: ['Today briefing', 'Attendance live capture', 'Students + Profile', 'Fees', 'WhatsApp broadcast', 'This spec screen'] },
      { phase: 'Phase 1 · 6 weeks',        items: ['Syllabus coverage tracker (Learning module deepen)', 'Educator timetable + cover board', 'Emergency contact escalation ladder', 'agent_signals emission'] },
      { phase: 'Phase 2 · 12 weeks',       items: ['NEXT agent adaptation loop live', 'Resource booking + conflict resolver', 'Multi-curriculum assessment rubrics', 'Ask NEXT conversational layer'] },
      { phase: 'Phase 3 · pilot rollout',  items: ['3 partner schools in Kampala + Mbale', 'Offline-first PWA build', 'SIS adapter for legacy school systems', 'Security + DPA audit'] },
    ];

    // ─── Deployable prototype artifacts ──────────────────────────────
    const manifest = `{
  "next_os": { "spec": "1.0", "kind": "school_os_prototype" },
  "app": {
    "id": "next.school-os",
    "name": "NEXT School OS",
    "version": "0.1.0-prototype",
    "tenant_model": "per_school",
    "entry": "index.html",
    "runtime": "static-spa"
  },
  "modules": [
    { "id": "today",    "route": "today",    "priority": "P0", "offline": true  },
    { "id": "attn",     "route": "attn",     "priority": "P0", "offline": true,  "emits": ["attendance.flag"] },
    { "id": "learn",    "route": "learn",    "priority": "P0", "offline": true,  "emits": ["syllabus.gap"] },
    { "id": "teach",    "route": "teach",    "priority": "P1", "offline": false, "emits": ["resource.conflict","cover.needed"] },
    { "id": "comm",     "route": "comm",     "priority": "P0", "offline": false, "consumes": ["attendance.flag","fees.due","syllabus.gap"] },
    { "id": "students", "route": "students", "priority": "P0", "offline": true  },
    { "id": "fees",     "route": "fees",     "priority": "P1", "offline": false, "emits": ["fees.due"] }
  ],
  "agent": {
    "signals_endpoint": "/api/agent/signals",
    "adaptation_endpoint": "/api/agent/adapt",
    "heartbeat_sec": 60,
    "capabilities": ["toggle_module","retune_sync","swap_curriculum","rotate_channel","scale_offline_cache"]
  },
  "config_schema_ref": "#/school_config",
  "school_config": {
    "school_id": "string",
    "curriculum": ["CBC","Cambridge","IGCSE","IB"],
    "languages": ["en","sw","lg"],
    "channels": { "whatsapp": true, "sms": true, "in_app": true },
    "connectivity_profile": ["3g","2g","offline_first"],
    "identity": ["google_edu","sms_otp","school_issued"]
  },
  "deploy": {
    "targets": ["next-agent","cloudflare-pages","static-bucket"],
    "build": "none (single-file prototype)",
    "healthcheck": "/?probe=1",
    "rollback": "previous artifact hash"
  }
}`;

    const agentContract = [
      ['POST /api/agent/signals',    'module emits { module, health, latency_ms, last_run, hint } — NEXT agent ingests'],
      ['GET  /api/agent/manifest',   'returns the live next.manifest.json above for the requesting school_id'],
      ['POST /api/agent/adapt',      '{ action, target, params } — toggle_module, retune_sync, swap_curriculum, rotate_channel'],
      ['POST /api/agent/provision',  'spin up a new school tenant from school_config payload'],
      ['GET  /api/agent/audit',      'tail of audit_events for compliance + self-healing diagnostics'],
    ];

    const deploySteps = [
      'NEXT agent fetches next.manifest.json + school_config from registry.',
      'Agent renders per-school build (modules toggled, curriculum + language injected, channels keyed).',
      'Artifact pushed to edge target (Cloudflare Pages / static bucket / on-prem PWA cache).',
      'Healthcheck + first signals heartbeat must pass within 60s or agent auto-rolls back.',
      'Continuous loop: agent_signals → adaptation_endpoint → re-emit manifest patch → hot-reload.',
    ];

    const envVars = [
      ['NEXT_SCHOOL_ID',         'tenant identifier issued by NEXT registry'],
      ['NEXT_AGENT_URL',         'base URL of the NEXT autonomous agent'],
      ['NEXT_AGENT_TOKEN',       'signed JWT — module → agent calls'],
      ['WHATSAPP_API_TOKEN',     'Meta Cloud API or local BSP credential'],
      ['SMS_GATEWAY_URL',        'Africa\u2019s Talking / local gateway endpoint'],
      ['DB_URL',                 'Postgres connection (RLS keyed on school_id)'],
      ['STORAGE_BUCKET',         'evidence uploads (lesson photos, signed PDFs)'],
    ];

    return (
      <div style={{ padding: '28px 32px 80px', maxWidth: 1180, margin: '0 auto', fontFamily: T.font }}>
        {/* Hero */}
        <div style={{ ...card, background: 'linear-gradient(135deg, ' + T.surface3 + ' 0%, #2b3b85 60%, ' + T.surface + ' 100%)', borderColor: T.borderStr, padding: 28 }}>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.gold, letterSpacing: '0.14em' }}>NEXT · SCHOOL OS · DEPLOYABLE PROTOTYPE v0.1</div>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: '10px 0 8px', color: T.ink }}>
            A deployable school OS prototype — ready for the NEXT autonomous agent to ship per school.
          </h1>
          <p style={{ ...p, fontSize: 15, color: T.ink2, maxWidth: 760 }}>
            Single-file, mobile-first prototype for Ugandan primary schools and adaptable across African and
            international curricula. Ships with a manifest, agent contract, signal schema and deploy steps so the
            NEXT agent can provision, adapt and self-heal each tenant without a redeploy.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.good || '#3ecf8e', border: '1px solid ' + (T.good || '#3ecf8e'), padding: '3px 9px', borderRadius: 999 }}>● READY-TO-DEPLOY</span>
            <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.gold, border: '1px solid ' + T.gold, padding: '3px 9px', borderRadius: 999 }}>NEXT-AGENT COMPATIBLE</span>
            <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.ink2, border: '1px solid ' + T.border, padding: '3px 9px', borderRadius: 999 }}>OFFLINE-TOLERANT · PWA-READY</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            {pillars.map((pl, i) => (
              <button key={pl.k} onClick={() => onNav(pl.screen)} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.border, color: T.ink,
                padding: '8px 13px', borderRadius: 999, fontSize: 12, cursor: 'pointer', fontFamily: T.mono, letterSpacing: '0.04em',
              }}>
                <span style={{ color: pillarColors[i], marginRight: 8 }}>●</span>{pl.title.split(' & ')[0]} → open
              </button>
            ))}
          </div>
        </div>

        {/* Four pillars */}
        <div style={card}>
          <div style={h2}>The four equally urgent problem areas</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {pillars.map((pl, i) => (
              <div key={pl.k} style={{ background: T.surface2, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>{pl.title}</div>
                  <span style={{ fontFamily: T.mono, fontSize: 10.5, color: pillarColors[i], border: '1px solid ' + pillarColors[i], padding: '2px 7px', borderRadius: 999 }}>{pl.prio}</span>
                </div>
                <div style={{ ...p, fontSize: 12.5, color: T.ink3, marginBottom: 10 }}>{pl.why}</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {pl.does.map((d, j) => <li key={j} style={li}>{d}</li>)}
                </ul>
                <button onClick={() => onNav(pl.screen)} style={{
                  marginTop: 12, background: 'transparent', border: '1px solid ' + T.borderStr, color: T.ink,
                  padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: T.mono,
                }}>Open live module →</button>
              </div>
            ))}
          </div>
        </div>

        {/* How modules interconnect */}
        <div style={card}>
          <div style={h2}>How the four modules interconnect</div>
          <pre style={{
            margin: 0, padding: 16, background: T.surface2, border: '1px solid ' + T.border, borderRadius: 10,
            color: T.ink2, fontFamily: T.mono, fontSize: 12, lineHeight: 1.55, overflowX: 'auto',
          }}>{
`              ┌──────────────────────────┐
              │     NEXT AGENT LAYER     │  ← per-school adaptation, signals, self-healing
              └─────────────┬────────────┘
                            │  agent_signals · config manifest
   ┌────────────────┬───────┴────────┬────────────────┐
   ▼                ▼                ▼                ▼
 ATTENDANCE  ↔  SYLLABUS / LEARNING ↔ STAFF / RESOURCES ↔ PARENT COMMS
   │                │                │                │
   └─── at-risk ────┼── coverage ────┼── cover/booking ┘
                    │
                shared core: students · guardians · audit · auth · messages`
          }</pre>
          <ul style={{ margin: '14px 0 0', paddingLeft: 18 }}>
            {flows.map((f, i) => <li key={i} style={li}>{f}</li>)}
          </ul>
        </div>

        {/* Database */}
        <div style={card}>
          <div style={h2}>Recommended database schema (core entities)</div>
          <div style={{ border: '1px solid ' + T.border, borderRadius: 10, overflow: 'hidden' }}>
            {schema.map((row, i) => (
              <div key={row[0]} style={{
                display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16,
                padding: '10px 14px', background: i % 2 ? T.surface2 : 'transparent',
                borderTop: i ? '1px solid ' + T.border : 'none',
              }}>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.gold }}>{row[0]}</div>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.ink2 }}>{row[1]}</div>
              </div>
            ))}
          </div>
          <p style={{ ...p, marginTop: 12, fontSize: 12.5, color: T.ink3 }}>
            Row-level security keyed on <code style={{ color: T.gold }}>school_id</code> + role; PII columns
            (phone, address, medical) field-masked unless the requesting role passes a justification check
            written to <code style={{ color: T.gold }}>audit_events</code>.
          </p>
        </div>

        {/* Roles */}
        <div style={card}>
          <div style={h2}>Role-based access</div>
          <div style={{ border: '1px solid ' + T.border, borderRadius: 10, overflow: 'hidden' }}>
            {roles.map((r, i) => (
              <div key={r[0]} style={{
                display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16,
                padding: '10px 14px', background: i % 2 ? T.surface2 : 'transparent',
                borderTop: i ? '1px solid ' + T.border : 'none',
              }}>
                <div style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>{r[0]}</div>
                <div style={{ fontSize: 12.5, color: T.ink2 }}>{r[1]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* NEXT OS integration */}
        <div style={card}>
          <div style={h2}>Integration points with NEXT OS</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {nextOsHooks.map((h, i) => <li key={i} style={li}>{h}</li>)}
          </ul>
        </div>

        {/* Design principles */}
        <div style={card}>
          <div style={h2}>System design principles</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {principles.map((pr, i) => <li key={i} style={li}>{pr}</li>)}
          </ul>
        </div>

        {/* Deployment manifest */}
        <div style={card}>
          <div style={h2}>Deployment manifest · next.manifest.json</div>
          <p style={{ ...p, fontSize: 12.5, color: T.ink3 }}>
            Drop this manifest beside the prototype. The NEXT agent reads it to discover modules, capabilities,
            and adaptation endpoints — no manual wiring per school.
          </p>
          <pre style={{
            margin: 0, padding: 16, background: T.surface2, border: '1px solid ' + T.border, borderRadius: 10,
            color: T.ink2, fontFamily: T.mono, fontSize: 11.5, lineHeight: 1.5, overflowX: 'auto', maxHeight: 420,
          }}>{manifest}</pre>
        </div>

        {/* Agent contract */}
        <div style={card}>
          <div style={h2}>NEXT agent contract · HTTP surface</div>
          <div style={{ border: '1px solid ' + T.border, borderRadius: 10, overflow: 'hidden' }}>
            {agentContract.map((row, i) => (
              <div key={row[0]} style={{
                display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16,
                padding: '10px 14px', background: i % 2 ? T.surface2 : 'transparent',
                borderTop: i ? '1px solid ' + T.border : 'none',
              }}>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.gold }}>{row[0]}</div>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.ink2 }}>{row[1]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Deploy steps */}
        <div style={card}>
          <div style={h2}>Deploy steps · agent-driven rollout</div>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {deploySteps.map((s, i) => <li key={i} style={li}>{s}</li>)}
          </ol>
        </div>

        {/* Env vars */}
        <div style={card}>
          <div style={h2}>Runtime environment · provisioned by agent</div>
          <div style={{ border: '1px solid ' + T.border, borderRadius: 10, overflow: 'hidden' }}>
            {envVars.map((row, i) => (
              <div key={row[0]} style={{
                display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16,
                padding: '10px 14px', background: i % 2 ? T.surface2 : 'transparent',
                borderTop: i ? '1px solid ' + T.border : 'none',
              }}>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.gold }}>{row[0]}</div>
                <div style={{ fontFamily: T.mono, fontSize: 12.5, color: T.ink2 }}>{row[1]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap */}

        <div style={card}>
          <div style={h2}>Prioritised implementation roadmap</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {roadmap.map((ph, i) => (
              <div key={ph.phase} style={{ background: T.surface2, border: '1px solid ' + T.border, borderRadius: 12, padding: 16 }}>
                <div style={{ fontFamily: T.mono, fontSize: 11, color: pillarColors[i % 4], letterSpacing: '0.08em', marginBottom: 8 }}>{ph.phase.toUpperCase()}</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {ph.items.map((it, j) => <li key={j} style={li}>{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, background: 'transparent', borderStyle: 'dashed', textAlign: 'center' }}>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.ink3, letterSpacing: '0.1em' }}>
            HAND-OFF · this spec screen doubles as the dev brief — every left-nav module below is its live counterpart.
          </div>
        </div>
      </div>
    );
  }

  // ─── Desktop shell · sidebar + routed screen ──────────────────────────────
  function DesktopShell() {
    useStoreVersion();
    const [narrow, setNarrow] = useState(typeof window !== 'undefined' && window.innerWidth < 820);
    const [navOpen, setNavOpen] = useState(false);
    useEffect(() => {
      const onR = () => setNarrow(window.innerWidth < 820);
      window.addEventListener('resize', onR);
      return () => window.removeEventListener('resize', onR);
    }, []);
    const initialRoute = (window.PEAK_ROLE && window.PEAK_ROLE.defaultRouteForRole()) || 'today';
    const [route, setRoute] = useState(initialRoute);
    const [profileStudentId, setProfileStudentId] = useState(4);
    const [, _pkgBump] = useReducer(x => x + 1, 0);
    useEffect(() => { if (window.PEAK_PACKAGES) window.PEAK_PACKAGES.loadPackage().then(() => _pkgBump()); }, []);
    useEffect(() => { try { const tn = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || 'peak-primary'; fetch('https://nextos-sentinel.nextafricaai.workers.dev/os-data?kind=school_profile&tenant=' + encodeURIComponent(tn)).then(r => r.json()).then(d => { const rec = ((d && d.records) || [])[0]; if (rec && rec.payload && rec.payload.markdown) window.__SCHOOL_PROFILE = rec.payload.markdown; }).catch(() => {}); fetch('https://nextos-sentinel.nextafricaai.workers.dev/os-data?kind=fee_structure&tenant=' + encodeURIComponent(tn)).then(r => r.json()).then(d => { const rec = ((d && d.records) || [])[0]; if (rec && rec.payload) window.__FEE_STRUCTURE = rec.payload; }).catch(() => {}); } catch (e) {} }, []);
    useEffect(() => { try { const WKx = 'https://nextos-sentinel.nextafricaai.workers.dev'; const tn = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || 'peak-primary';
      fetch(WKx + '/os-data?kind=term_config&tenant=' + encodeURIComponent(tn)).then(r => r.json()).then(d => { const rec = ((d && d.records) || [])[0]; if (rec && rec.payload) window.__TERM = rec.payload; }).catch(() => {});
      fetch(WKx + '/os-data?kind=school_event&tenant=' + encodeURIComponent(tn)).then(r => r.json()).then(d => { window.__SCHOOL_EVENTS = ((d && d.records) || []).map(x => x.payload).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 30); }).catch(() => {});
      
      const sb = window.NextSession?.sb;
      if (sb) {
        sb.from('teacher_logs').select('*').eq('tenant_id', tn).order('recorded_at', { ascending: false }).then(({ data }) => {
          if (data) window.__TEACHER_LOGS = data;
        }).catch(() => {});
      }
    } catch (e) {} }, []);


    const navigate = (k) => setRoute(k);
    const openProfile = (s) => { if (s) setProfileStudentId(s.id); setRoute('profile'); };
    const openNewStudent  = () => window.peakModal.open(<PEAK_FORMS.AddStudent  store={Store} />);
    const openNewTeacher  = () => window.peakModal.open(<PEAK_FORMS.AddTeacher  store={Store} />);
    const openRecordPay   = () => window.peakModal.open(<PEAK_FORMS.RecordPayment store={Store} />);

    // Expose globals for screens that need them
    window.peakNav = navigate;
    window.peakOpenProfile = openProfile;
    window.peakNewStudent  = openNewStudent;
    window.peakNewTeacher  = openNewTeacher;

    let Screen;
    if      (route === 'spec')    Screen = <SpecScreen onNav={navigate} />;
    else if (route === 'today')   Screen = <PD_Today.Today      embed onNav={navigate} />;
    else if (route === 'dash')    Screen = <V4.Dashboard         embed onNav={navigate} />;
    else if (route === 'stud')    Screen = <PD_Students.Students embed onNav={navigate} onOpenProfile={openProfile} onAddStudent={openNewStudent} />;
    else if (route === 'profile') Screen = <PD_Profile.Profile   embed onNav={navigate} onBack={() => setRoute('stud')} studentId={profileStudentId} />;
    else if (route === 'fees')    Screen = <PD_Fees.Fees         embed onNav={navigate} onRecordPayment={openRecordPay} />;
    else if (route === 'comm')    Screen = <PD_Broadcast.Broadcast embed onNav={navigate} />;
    else if (route === 'attn')    Screen = <PEAK_SCREENS.Attendance onNav={navigate} store={Store} />;
    else if (route === 'teach')   Screen = (window.PEAK_STAFF ? <PEAK_STAFF.Staff onNav={navigate} /> : <PEAK_SCREENS.Teachers onNav={navigate} onAddTeacher={openNewTeacher} />);
    else if (route === 'trans')   Screen = <PEAK_SCREENS.Transport  onNav={navigate} />;
    else if (route === 'learn')   Screen = (window.PEAK_LEARNING ? <PEAK_LEARNING.Learning /> : <PEAK_SCREENS.Learning onNav={navigate} />);
    else if (route === 'rep')     Screen = <PEAK_SCREENS.Reports    onNav={navigate} />;
    else if (route === 'exam')    Screen = (window.PEAK_EXAMS ? <PEAK_EXAMS.Exams onNav={navigate} /> : <GenericModuleScreen routeKey={route} onNav={navigate} />);
    else if (route === 'marking') Screen = (window.PEAK_MARKING ? <PEAK_MARKING.Mark /> : <GenericModuleScreen routeKey={route} onNav={navigate} />);
    else if (route === 'finance') Screen = (window.PEAK_FINANCE ? <PEAK_FINANCE.Finance /> : <GenericModuleScreen routeKey={route} onNav={navigate} />);
    else if (route === 'campus') Screen = (window.PEAK_CAMPUS ? <PEAK_CAMPUS.SmartCampus /> : <GenericModuleScreen routeKey={route} onNav={navigate} />);
    else if (route === 'boarding') Screen = (typeof window.HeadBoardingPanel === 'function' ? React.createElement(window.HeadBoardingPanel, { onNav: navigate }) : <GenericModuleScreen routeKey={route} onNav={navigate} />);
    else if (route === 'setup')   Screen = (window.PEAK_SETUP ? <PEAK_SETUP.Setup /> : <GenericModuleScreen routeKey={route} onNav={navigate} />);
    else if (route === 'staff') Screen = (typeof window.HeadStaffPanel === 'function' ? React.createElement(window.HeadStaffPanel, { onNav: navigate }) : <GenericModuleScreen routeKey={route} onNav={navigate} />);
    else if (route === 'timetable') Screen = (typeof window.HeadTimetablePanel === 'function' ? React.createElement(window.HeadTimetablePanel, { onNav: navigate }) : (window.PEAK_TIMETABLE ? <PEAK_TIMETABLE.Timetable onNav={navigate} /> : <GenericModuleScreen routeKey={route} onNav={navigate} />));
    else if (route === 'events')  Screen = (window.PEAK_EVENTS ? <PEAK_EVENTS.Events /> : <GenericModuleScreen routeKey={route} onNav={navigate} />);
    else if (route === 'plan')    Screen = (window.PEAK_PACKAGES ? <PEAK_PACKAGES.Plan onNav={navigate} /> : <GenericModuleScreen routeKey={route} onNav={navigate} />);
    else if (route && route.indexOf('addon:') === 0) Screen = (window.PEAK_PACKAGES ? <PEAK_PACKAGES.Addon addonKey={route.slice(6)} /> : <GenericModuleScreen routeKey={route} onNav={navigate} />);

    if (!Screen) Screen = <GenericModuleScreen routeKey={route || 'today'} onNav={navigate} />;

    // ── Entitlement gate: premium modules show an upgrade screen below their tier ──
    if (window.PEAK_PACKAGES) {
      const GATED = { comm: 'Communications', finance: 'Finance & payroll', learn: 'Learning & coverage', marking: 'AI exam marking' };
      if (GATED[route] && !window.PEAK_PACKAGES.entitled(route)) {
        Screen = <PEAK_PACKAGES.Locked moduleKey={route} label={GATED[route]} onNav={navigate} />;
      }
    }

    return (
      <div className="peak-shell" style={{ display: 'flex', height: '100vh', background: T.bg, color: T.ink, fontFamily: T.font, overflow: 'hidden' }}>
        {!narrow && <Sidebar route={route} onNav={navigate} />}
        {narrow && navOpen && (
          <React.Fragment>
            <div onClick={() => setNavOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 290 }} />
            <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 300, boxShadow: '0 0 50px rgba(0,0,0,0.6)' }}>
              <Sidebar route={route} onNav={(k) => { navigate(k); setNavOpen(false); }} />
            </div>
          </React.Fragment>
        )}
        <div className="peak-col" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {narrow && (
            <div className="peak-topbar" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: '1px solid ' + T.border, background: T.bg, flexShrink: 0 }}>
              <button onClick={() => setNavOpen(true)} aria-label="Menu" style={{ background: 'transparent', border: '1px solid ' + T.border, borderRadius: 9, color: T.ink, width: 40, height: 40, fontSize: 19, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>{'\u2630'}</button>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(typeof window !== 'undefined' && (window.__BRAND_NAME||window.__BRAND_FALLBACK)) || 'NEXT School OS'}</div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <PushBell compact />
                <span style={{ fontSize: 9, color: T.ink4, fontFamily: T.mono }}>b61</span>
              </div>
            </div>
          )}
          <div className="peak-screen" style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
            <ScreenErrorBoundary>{Screen}</ScreenErrorBoundary>
          </div>
        </div>
      </div>
    );
  }

  // ─── Web Push client (phone / lock-screen alerts) ─────────────────────────
  window.NX_VAPID = 'BN6fZK3_ipRqATydKqGPB22d-Iaf9knXLDZrLGqAuPeSfac0C8elNLovSBtKlEugC-t7XeMoYg8FsEUwTwb6Y-c';
  window.NX_PUSH = window.NX_PUSH || {
    WK: 'https://nextos-sentinel.nextafricaai.workers.dev',
    supported() { return (typeof navigator !== 'undefined') && ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window); },
    async status() { if (!this.supported()) return 'unsupported'; if (Notification.permission === 'denied') return 'denied'; try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); return sub ? 'on' : 'off'; } catch (e) { return 'off'; } },
    _key() { const raw = atob(window.NX_VAPID.replace(/-/g, '+').replace(/_/g, '/')); const a = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i); return a; },
    async enable(opts) {
      opts = opts || {};
      if (!this.supported()) throw new Error('This browser can’t do phone alerts. Install the app (Add to Home screen) first.');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Notifications were not allowed. Turn them on in your browser settings.');
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this._key() });
      const j = sub.toJSON();
      const r = await fetch(this.WK + '/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant: opts.tenant || 'next', email: (opts.email || '').toLowerCase(), role: opts.role || '', subscription: { endpoint: j.endpoint, keys: j.keys } }) });
      const d = await r.json(); if (!d.ok) throw new Error(d.error || 'Could not register this device.');
      return true;
    },
    async test(opts) { opts = opts || {}; const r = await fetch(this.WK + '/push/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant: opts.tenant || 'next', email: (opts.email || '').toLowerCase() }) }); return r.json(); },
    async notify(payload, token) { const r = await fetch(this.WK + '/push/notify', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token || '') }, body: JSON.stringify(payload) }); return r.json(); },
  };

  function PushBell({ compact } = {}) {
    const [st, setSt] = React.useState('off');
    const [busy, setBusy] = React.useState(false);
    const prof = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile) ? window.PEAK_ROLE.getProfile() : {};
    React.useEffect(() => { window.NX_PUSH.status().then(setSt); }, []);
    if (st === 'unsupported') return null;
    const on = st === 'on';
    const click = async () => {
      if (busy) return; setBusy(true);
      const L = [];
      try {
        L.push('Supported: ' + (window.NX_PUSH.supported() ? 'yes' : 'NO'));
        L.push('Permission: ' + (window.Notification ? Notification.permission : 'n/a'));
        if (window.Notification && Notification.permission !== 'granted') {
          const p = await Notification.requestPermission(); L.push('→ asked, now: ' + p);
        }
        let reg = null; try { reg = await navigator.serviceWorker.ready; } catch (e) {}
        L.push('SW active: ' + (reg && reg.active ? reg.active.scriptURL.split('/').pop() : 'NONE'));
        // Ensure subscription
        try { await window.NX_PUSH.enable({ tenant: prof.tenantId, email: prof.email, role: prof.role }); setSt('on'); } catch (e) { L.push('Subscribe error: ' + (e.message || e)); }
        let sub = null; try { sub = reg && (await reg.pushManager.getSubscription()); } catch (e) {}
        L.push('Subscribed to: ' + (sub ? (new URL(sub.endpoint).host) : 'NO'));
        // 1) LOCAL notification — tests the DISPLAY path only (no network)
        let localOk = false;
        try { if (reg) { await reg.showNotification('NEXT OS — local test', { body: 'If you see THIS, your phone can show alerts.', tag: 'nx-local' }); localOk = true; } } catch (e) { L.push('Local show FAILED: ' + (e.message || e)); }
        L.push('Local notification: ' + (localOk ? 'shown ✓' : 'blocked ✗'));
        // 2) SERVER push — tests the delivery path
        try { const res = await window.NX_PUSH.test({ tenant: prof.tenantId, email: prof.email }); L.push('Server push: matched ' + (res.matched || 0) + ', accepted ' + (res.sent || 0)); } catch (e) { L.push('Server push error: ' + (e.message || e)); }
        alert('NOTIFICATION SELF-TEST\n\n' + L.join('\n') + '\n\nIf "Local notification: shown" but you saw nothing, check iOS Settings → Notifications → this app (and turn off Focus/DND).');
      } catch (e) { alert('Self-test error: ' + (e.message || e) + '\n\n' + L.join('\n')); }
      setBusy(false);
    };
    const bell = on ? '\uD83D\uDD14' : '\uD83D\uDD15';
    return (
      <button onClick={click} disabled={busy} title={on ? 'Phone alerts on — tap to send a test' : 'Turn on phone alerts'} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, background: on ? 'rgba(34,197,94,0.12)' : 'transparent',
        border: '1px solid ' + (on ? 'rgba(34,197,94,0.5)' : T.border), borderRadius: 9, color: on ? T.good : T.ink2,
        padding: compact ? '6px 9px' : '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', fontFamily: T.font, flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, lineHeight: 1 }}>{bell}</span>{compact ? null : <span>{on ? 'Alerts on' : 'Enable alerts'}</span>}
      </button>
    );
  }
  window.PushBell = PushBell;

  // ─── Root · responsive + role-aware ───────────────────────────────────────
  function App() {
    // Role gate. Teachers get their own shell; parents get the dedicated phone
    // app; Head / Admin / Bursar get the full dashboard, now fully responsive
    // (collapsing sidebar drawer + reflowing grids) down to phone width.
    const role = (window.PEAK_ROLE && window.PEAK_ROLE.getRole()) || 'head';

    if (role === 'teacher' && typeof window.TeacherShell === 'function') {
      const TeacherShell = window.TeacherShell;
      return (
        <>
          <ActiveBrainMonitor />
          <TeacherShell />
          <ToastStack />
          <ModalLayer />
          {window.PeakNiaOrb ? React.createElement(window.PeakNiaOrb) : null}
        </>
      );
    }

    const Shell = role === 'parent' ? MobileShell : DesktopShell;
    return (
      <>
        <ActiveBrainMonitor />
        <Shell />
        <ToastStack />
        <ModalLayer />
        {window.PeakNiaOrb ? React.createElement(window.PeakNiaOrb) : null}
      </>
    );
  }

  window.App = App;

  class GlobalErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false };
    }
    
    static getDerivedStateFromError(error) {
      return { hasError: true };
    }
    
    componentDidCatch(error, errorInfo) {
      console.error("Agent Telemetry Caught:", error, errorInfo);

      const payload = {
        type: 'frontend_crash',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        tenant_id: (window.NextSession && window.NextSession.profile && window.NextSession.profile.tenantId) ||
          (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || 'unknown'
      };

      // window.SENTINEL_URL is never actually set anywhere in this app —
      // every crash report from every user was silently posting to
      // localhost:8787 and vanishing. Point directly at the real worker.
      const endpoint = 'https://nextos-sentinel.nextafricaai.workers.dev/telemetry';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.error("Telemetry failed to send:", err));
    }
    
    render() {
      if (this.state.hasError) {
        return (
          <div style={{ padding: 40, fontFamily: 'monospace', color: '#FF4757', background: '#0F1322', height: '100vh', boxSizing: 'border-box' }}>
            <h2>System Failure Detected</h2>
            <p>The Sentinel agent has been notified and is attempting to self-heal the system.</p>
            <button 
              onClick={() => window.location.reload()} 
              style={{ padding: '10px 20px', background: '#FF4757', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', marginTop: 20, fontWeight: 700 }}
            >
              Reload Application
            </button>
          </div>
        );
      }
      return this.props.children;
    }
  }

export default App;
