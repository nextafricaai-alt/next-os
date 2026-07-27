/* kabs-lily-timetable-data.js
   Full extracted digital timetable for Kabs Lily Primary School (P.1 through P.7).
   Transcribed directly from school timetable boards.

   Exposes:
     - window.KABS_LILY_TIMETABLE (raw array of 210 slots)
     - window.getKabsLilySlotsForDay(dayOfWeek, streamFilter)
     - window.seedKabsLilyTimetable(tenantId)
*/
(function () {
  const UPPER_TIMES = [
    { period: 1, start: '08:00:00', end: '09:00:00', label: '8:00 - 9:00 AM' },
    { period: 2, start: '09:00:00', end: '10:30:00', label: '9:00 - 10:30 AM' },
    { period: 3, start: '11:00:00', end: '12:00:00', label: '11:00 - 12:00 PM' },
    { period: 4, start: '12:00:00', end: '13:00:00', label: '12:00 - 1:00 PM' },
    { period: 5, start: '14:00:00', end: '15:30:00', label: '2:00 - 3:30 PM' },
    { period: 6, start: '15:30:00', end: '17:00:00', label: '3:30 - 5:00 PM' },
  ];

  const LOWER_TIMES = [
    { period: 1, start: '08:00:00', end: '09:30:00', label: '8:00 - 9:30 AM' },
    { period: 2, start: '09:30:00', end: '10:30:00', label: '9:30 - 10:30 AM' },
    { period: 3, start: '11:00:00', end: '12:00:00', label: '11:00 - 12:00 PM' },
    { period: 4, start: '12:00:00', end: '13:00:00', label: '12:00 - 1:00 PM' },
    { period: 5, start: '14:00:00', end: '15:00:00', label: '2:00 - 3:00 PM' },
    { period: 6, start: '15:00:00', end: '16:00:00', label: '3:00 - 4:00 PM' },
  ];

  // Grid definition by Day (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri)
  const RAW_GRID = {
    // ─── UPPER CLASSES (P.4 - P.7) ───
    1: { // MONDAY
      'P4': ['SST', 'ENG', 'MTC', 'MTC', 'SCI', 'SCI'],
      'P5': ['ENG', 'SST', 'SCI', 'SCI', 'MTC', 'MTC'],
      'P6': ['MTC', 'ENG', 'SCI', 'SCI', 'SST', 'SST'],
      'P7': ['SCI', 'SST', 'ENG', 'ENG', 'MTC', 'MTC'],
      // LOWER
      'P1': ['LIT', 'LUG', 'ENG', 'READING', 'MTC', 'R.E'],
      'P2': ['ENG', 'READING', 'MTC', 'R.E', 'LIT', 'LUG'],
      'P3': ['R.E', 'MTC', 'LIT', 'LUG', 'ENG', 'READING'],
    },
    2: { // TUESDAY
      'P4': ['SCI', 'ENG', 'MTC', 'MTC', 'SST', 'SST'],
      'P5': ['MTC', 'SCI', 'SST', 'SST', 'ENG', 'ENG'],
      'P6': ['ENG', 'MTC', 'SCI', 'SCI', 'SST', 'SST'],
      'P7': ['MTC', 'SST', 'ENG', 'ENG', 'SCI', 'SCI'],
      // LOWER
      'P1': ['ENG', 'READING', 'MTC', 'R.E', 'READING', 'ENG'],
      'P2': ['MTC', 'R.E', 'READING', 'ENG', 'LUG', 'LIT'],
      'P3': ['LIT', 'LUG', 'ENG', 'READING', 'MTC', 'MTC'],
    },
    3: { // WEDNESDAY
      'P4': ['SST', 'MTC', 'SCI', 'SCI', 'ENG', 'ENG'],
      'P5': ['ENG', 'SCI', 'MTC', 'MTC', 'SST', 'SST'],
      'P6': ['MTC', 'SCI', 'ENG', 'ENG', 'SST', 'SST'],
      'P7': ['SCI', 'SST', 'MTC', 'MTC', 'ENG', 'ENG'],
      // LOWER
      'P1': ['MTC', 'R.E', 'LIT', 'LUG', 'ENG', 'READING'],
      'P2': ['ENG', 'READING', 'MTC', 'R.E', 'LIT', 'LUG'],
      'P3': ['LUG', 'LIT', 'ENG', 'WRITING', 'MTC', 'MTC'],
    },
    4: { // THURSDAY
      'P4': ['ENG', 'SST', 'MTC', 'MTC', 'SCI', 'SCI'],
      'P5': ['SCI', 'MTC', 'SST', 'SST', 'ENG', 'ENG'],
      'P6': ['SCI', 'MTC', 'ENG', 'ENG', 'SST', 'SST'],
      'P7': ['ENG', 'SST', 'SCI', 'SCI', 'MTC', 'MTC'],
      // LOWER
      'P1': ['P.E', 'READING', 'R.E', 'MTC', 'LUG', 'LIT'],
      'P2': ['P.E', 'LIT', 'LUG', 'LIT', 'WRITING', 'ENG'],
      'P3': ['P.E', 'R.E', 'ENG', 'READING', 'R.E', 'R.E'],
    },
    5: { // FRIDAY
      'P4': ['ENG', 'SST', 'SCI', 'SCI', 'MTC', 'MTC'],
      'P5': ['SCI', 'MTC', 'ENG', 'ENG', 'SST', 'SST'],
      'P6': ['MTC', 'ENG', 'SCI', 'SCI', 'SST', 'SST'],
      'P7': ['ENG', 'SST', 'MTC', 'MTC', 'SCI', 'SCI'],
      // LOWER
      'P1': ['LIT', 'LUG', 'WRITING', 'ENG', 'LUG', 'LUG'],
      'P2': ['ENG', 'WRITING', 'R.E', 'MTC', 'READING', 'READING'],
      'P3': ['R.E', 'MTC', 'LUG', 'LIT', 'READING', 'READING'],
    },
  };

  // Build flattened slots list
  const slots = [];
  let idCounter = 1;

  for (let dow = 1; dow <= 5; dow++) {
    const dayGrid = RAW_GRID[dow];
    for (const [stream, subjects] of Object.entries(dayGrid)) {
      const isUpper = ['P4', 'P5', 'P6', 'P7'].includes(stream);
      const timeSpecs = isUpper ? UPPER_TIMES : LOWER_TIMES;

      subjects.forEach((subject, idx) => {
        const time = timeSpecs[idx];
        slots.push({
          id: 'kl-slot-' + (idCounter++),
          day_of_week: dow,
          stream: stream,
          period: time.period,
          start_time: time.start,
          end_time: time.end,
          subject: subject,
          label: time.label,
          section: isUpper ? 'Upper Primary' : 'Lower Primary',
        });
      });
    }
  }

  window.KABS_LILY_TIMETABLE = slots;

  window.getKabsLilySlotsForDay = function (dow, streamFilter) {
    // dow: 1..5. If weekend (6 or 7), default to Monday (1) for display
    const d = (dow >= 1 && dow <= 5) ? dow : 1;
    return slots.filter(s => s.day_of_week === d && (!streamFilter || s.stream === streamFilter));
  };

  window.seedKabsLilyTimetable = async function (tenantId) {
    const tid = tenantId || 'kabs-lily';
    // Save to localStorage as fallback
    try {
      localStorage.setItem('kabs_lily_timetable_' + tid, JSON.stringify(slots));
    } catch (_) {}

    // Save to Supabase if client is active
    const sb = window.NextSession?.sb;
    if (sb) {
      const dbRows = slots.map(s => ({
        tenant_id: tid,
        day_of_week: s.day_of_week,
        stream: s.stream,
        period: s.period,
        start_time: s.start_time,
        end_time: s.end_time,
        subject: s.subject,
        label: s.label,
      }));
      try {
        await sb.from('timetable_slots').delete().eq('tenant_id', tid);
        await sb.from('timetable_slots').insert(dbRows);
      } catch (err) {
        console.warn('[KabsLily] Supabase seed warning:', err);
      }
    }
    return slots;
  };
})();
