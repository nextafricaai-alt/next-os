import React, { useEffect } from 'react';

// Nia's Active Brain: Continuously analyzes state for conflicts & patterns
// It operates passively in the background across all views.
export function ActiveBrainMonitor() {
  // 1. Real-time notifications from Postgres (Supabase)
  useEffect(() => {
    const sb = window.NextSession?.sb;
    if (!sb) return;
    const tenant = (window.PEAK_ROLE && window.PEAK_ROLE.getProfile && window.PEAK_ROLE.getProfile().tenantId) || 'peak-primary';
    
    const sub = sb.channel('admin_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'teacher_logs', filter: 'tenant_id=eq.' + tenant }, payload => {
        const row = payload.new;
        window.peakToast && window.peakToast('New Teacher Suggestion', 'info', 'From ' + (row.teacher_name || 'Teacher') + ': ' + row.message.substring(0, 40) + '...');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'student_health_records', filter: 'tenant_id=eq.' + tenant }, payload => {
        const row = payload.new;
        window.peakToast && window.peakToast('New Health Note Logged', 'warn', 'Category: ' + row.category + ' - ' + row.description.substring(0, 40) + '...');
      })
      .subscribe();
    
    return () => { sb.removeChannel(sub); };
  }, []);

  // 2. Active Polling & Conflict Resolution
  useEffect(() => {
    const alerted = {}; 
    const interval = setInterval(() => {
      if (!window.PEAK) return;
      const now = new Date();
      const studs = window.PEAK.students || [];
      const teach = window.PEAK.teachers || [];
      
      // A. Unchecked-in Teachers Conflict (System expects them but they haven't logged in)
      const unchecked = teach.filter(t => !t.checkedIn);
      if (unchecked.length > 0 && unchecked.length < teach.length) {
        const key = 'missing_teachers_' + now.toDateString();
        if (!alerted[key]) {
          alerted[key] = true;
          window.peakToast && window.peakToast('Nia Active Insight', 'warn', unchecked.length + ' teacher(s) have not logged in/checked in today. This conflicts with the active timetable.');
        }
      }
      
      // B. Financial Flight Risk Conflict (High balance + dropping attendance)
      const flightRisks = studs.filter(s => s.balance > 150000 && (s.attendanceWk != null && s.attendanceWk <= 60));
      if (flightRisks.length > 0) {
        const key = 'flight_risk_' + flightRisks[0].id + '_' + now.toDateString();
        if (!alerted[key]) {
          alerted[key] = true;
          window.peakToast && window.peakToast('Nia Active Insight', 'error', flightRisks.length + ' student(s) have high unpaid fees AND dropping attendance (Flight Risk).');
        }
      }

      // C. Health & Safety Follow-ups
      const healthIssues = (window.PEAK.healthRecords || []).filter(h => h.follow_up);
      if (healthIssues.length > 0) {
         const key = 'health_followup_' + now.toDateString();
         if (!alerted[key]) {
           alerted[key] = true;
           window.peakToast && window.peakToast('Nia Active Insight', 'warn', healthIssues.length + ' student(s) have unresolved health records requiring immediate follow-up.');
         }
      }
    }, 45000); // Check every 45s passively in the background
    return () => clearInterval(interval);
  }, []);

  return null; // This component is passive and renders nothing
}
