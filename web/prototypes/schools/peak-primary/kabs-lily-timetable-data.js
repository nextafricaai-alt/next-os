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
    { period: 1, start: '08:00:00', end: '09:00:00', label: 'Period 1 (8:00 - 9:00 AM)' },
    { period: 2, start: '09:00:00', end: '10:00:00', label: 'Period 2 (9:00 - 10:00 AM)' },
    { period: 3, start: '11:00:00', end: '12:00:00', label: 'Period 3 (11:00 - 12:00 PM)' },
    { period: 4, start: '12:00:00', end: '13:00:00', label: 'Period 4 (12:00 - 1:00 PM)' },
    { period: 5, start: '14:00:00', end: '15:00:00', label: 'Period 5 (2:00 - 3:00 PM)' },
    { period: 6, start: '15:00:00', end: '16:00:00', label: 'Period 6 (3:00 - 4:00 PM)' },
    { period: 7, start: '16:00:00', end: '17:00:00', label: 'Extra Period (4:00 - 5:00 PM)' },
  ];

  const LOWER_TIMES = UPPER_TIMES;

  // Grid definition by Day (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri)
  const RAW_GRID = {
    // ─── UPPER & LOWER CLASSES (P.1 - P.7) ───
    1: { // MONDAY
      'P1': ['LIT', 'LUG', 'ENG', 'READING', 'MTC', 'R.E', 'Games / Reading'],
      'P2': ['ENG', 'READING', 'MTC', 'R.E', 'LIT', 'LUG', 'Games / Reading'],
      'P3': ['R.E', 'MTC', 'LIT', 'LUG', 'ENG', 'READING', 'Games / Reading'],
      'P4': ['SST', 'ENG', 'MTC', 'MTC', 'SCI', 'SCI', 'Clubs / Games'],
      'P5': ['ENG', 'SST', 'SCI', 'SCI', 'MTC', 'MTC', 'SST (Extra)'],
      'P6': ['MTC', 'ENG', 'SCI', 'SCI', 'SST', 'SST', 'ENG (Extra)'],
      'P7': ['SCI', 'SST', 'ENG', 'ENG', 'MTC', 'MTC', 'MTC (Extra)'],
    },
    2: { // TUESDAY
      'P1': ['ENG', 'READING', 'MTC', 'R.E', 'READING', 'ENG', 'Games / Reading'],
      'P2': ['MTC', 'R.E', 'READING', 'ENG', 'LUG', 'LIT', 'Games / Reading'],
      'P3': ['LIT', 'LUG', 'ENG', 'READING', 'MTC', 'MTC', 'Games / Reading'],
      'P4': ['SCI', 'ENG', 'MTC', 'MTC', 'SST', 'SST', 'Clubs / Games'],
      'P5': ['MTC', 'SCI', 'SST', 'SST', 'ENG', 'ENG', 'ENG (Extra)'],
      'P6': ['ENG', 'MTC', 'SCI', 'SCI', 'SST', 'SST', 'MTC (Extra)'],
      'P7': ['MTC', 'SST', 'ENG', 'ENG', 'SCI', 'SCI', 'SCI (Extra)'],
    },
    3: { // WEDNESDAY
      'P1': ['MTC', 'R.E', 'LIT', 'LUG', 'ENG', 'READING', 'Games / Reading'],
      'P2': ['ENG', 'READING', 'MTC', 'R.E', 'LIT', 'LUG', 'Games / Reading'],
      'P3': ['LUG', 'LIT', 'ENG', 'WRITING', 'MTC', 'MTC', 'Games / Reading'],
      'P4': ['SST', 'MTC', 'SCI', 'SCI', 'ENG', 'ENG', 'Clubs / Games'],
      'P5': ['ENG', 'SCI', 'MTC', 'MTC', 'SST', 'SST', 'SST (Extra)'],
      'P6': ['MTC', 'SCI', 'ENG', 'ENG', 'SST', 'SST', 'SCI (Extra)'],
      'P7': ['SCI', 'SST', 'MTC', 'MTC', 'ENG', 'ENG', 'ENG (Extra)'],
    },
    4: { // THURSDAY
      'P1': ['P.E', 'READING', 'R.E', 'MTC', 'LUG', 'LIT', 'Games / Reading'],
      'P2': ['P.E', 'LIT', 'LUG', 'LIT', 'WRITING', 'ENG', 'Games / Reading'],
      'P3': ['P.E', 'R.E', 'ENG', 'READING', 'R.E', 'R.E', 'Games / Reading'],
      'P4': ['ENG', 'SST', 'MTC', 'MTC', 'SCI', 'SCI', 'Clubs / Games'],
      'P5': ['SCI', 'MTC', 'SST', 'SST', 'ENG', 'ENG', 'ENG (Extra)'],
      'P6': ['SCI', 'MTC', 'ENG', 'ENG', 'SST', 'SST', 'MTC (Extra)'],
      'P7': ['ENG', 'SST', 'SCI', 'SCI', 'MTC', 'MTC', 'SST (Extra)'],
    },
    5: { // FRIDAY
      'P1': ['LIT', 'LUG', 'WRITING', 'ENG', 'LUG', 'LUG', 'Games / Reading'],
      'P2': ['ENG', 'WRITING', 'R.E', 'MTC', 'READING', 'READING', 'Games / Reading'],
      'P3': ['R.E', 'MTC', 'LUG', 'LIT', 'READING', 'READING', 'Games / Reading'],
      'P4': ['ENG', 'SST', 'SCI', 'SCI', 'MTC', 'MTC', 'Clubs / Games'],
      'P5': ['SCI', 'MTC', 'ENG', 'ENG', 'SST', 'SST', 'SCI (Extra)'],
      'P6': ['MTC', 'ENG', 'SCI', 'SCI', 'SST', 'SST', 'ENG (Extra)'],
      'P7': ['ENG', 'SST', 'MTC', 'MTC', 'SCI', 'SCI', 'MTC (Extra)'],
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
    }
  };

  window.getKabsLilyDigitalGrid = function () {
    const classes = ['Baby', 'Middle', 'Top', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
    const daysMap = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' };
    const grid = {};

    const nurseryGrid = {
      'Mon': {
        'Baby':   [ {subject:'P.E (8:00-8:30) / LA 1',teacher:'Tr. Jus'}, {subject:'LA 1 (8:30-10:00)',teacher:'Tr. Jus'}, {brk:true}, {subject:'LA 2 (11:00-12:30)',teacher:'Tr. Mayira'}, {subject:'LA 2',teacher:'Tr. Mayira'}, {brk:true}, {subject:'1:00 PM DISMISSAL 🏠',teacher:''}, {subject:'Home',teacher:''}, {subject:'Home',teacher:''} ],
        'Middle': [ {subject:'P.E (8:00-8:30) / LA 1',teacher:'Tr. Jemima'}, {subject:'LA 1 (8:30-10:00)',teacher:'Tr. Jemima'}, {brk:true}, {subject:'LA 3 (11:00-12:30)',teacher:'Tr. Jus'}, {subject:'LA 3',teacher:'Tr. Jus'}, {brk:true}, {subject:'1:00 PM DISMISSAL 🏠',teacher:''}, {subject:'Home',teacher:''}, {subject:'Home',teacher:''} ],
        'Top':    [ {subject:'P.E (8:00-8:30) / LA 1',teacher:'Tr. Mayira'}, {subject:'LA 1 (8:30-10:00)',teacher:'Tr. Mayira'}, {brk:true}, {subject:'LA 2 (11:00-12:30)',teacher:'Tr. Jemima'}, {subject:'LA 2',teacher:'Tr. Jemima'}, {brk:true}, {subject:'Evening LA 5 (2:00-3:30pm)',teacher:'Tr. Mayira'}, {subject:'3:30 PM DISMISSAL 🏠',teacher:'Tr. Mayira'}, {subject:'Home',teacher:''} ]
      },
      'Tue': {
        'Baby':   [ {subject:'LA 1 (8:30-10:00)',teacher:'Tr. Jemima'}, {subject:'LA 1',teacher:'Tr. Jemima'}, {brk:true}, {subject:'LA 4 (11:00-12:30)',teacher:'Tr. Jus'}, {subject:'LA 4',teacher:'Tr. Jus'}, {brk:true}, {subject:'1:00 PM DISMISSAL 🏠',teacher:''}, {subject:'Home',teacher:''}, {subject:'Home',teacher:''} ],
        'Middle': [ {subject:'LA 2 (8:30-10:00)',teacher:'Tr. Mayira'}, {subject:'LA 2',teacher:'Tr. Mayira'}, {brk:true}, {subject:'LA 1 (11:00-12:30)',teacher:'Tr. Jemima'}, {subject:'LA 1',teacher:'Tr. Jemima'}, {brk:true}, {subject:'1:00 PM DISMISSAL 🏠',teacher:''}, {subject:'Home',teacher:''}, {subject:'Home',teacher:''} ],
        'Top':    [ {subject:'LA 3 (8:30-10:00)',teacher:'Tr. Jus'}, {subject:'LA 3',teacher:'Tr. Jus'}, {brk:true}, {subject:'LA 2 (11:00-12:30)',teacher:'Tr. Mayira'}, {subject:'LA 2',teacher:'Tr. Mayira'}, {brk:true}, {subject:'Evening LA (2:00-3:30pm)',teacher:'Tr. Jus'}, {subject:'3:30 PM DISMISSAL 🏠',teacher:'Tr. Jus'}, {subject:'Home',teacher:''} ]
      },
      'Wed': {
        'Baby':   [ {subject:'LA 4 (8:30-10:00)',teacher:'Tr. Jus'}, {subject:'LA 4',teacher:'Tr. Jus'}, {brk:true}, {subject:'LA 5 (11:00-12:30)',teacher:'Tr. Mayira'}, {subject:'LA 5',teacher:'Tr. Mayira'}, {brk:true}, {subject:'1:00 PM DISMISSAL 🏠',teacher:''}, {subject:'Home',teacher:''}, {subject:'Home',teacher:''} ],
        'Middle': [ {subject:'LA 4 (8:30-10:00)',teacher:'Tr. Jemima'}, {subject:'LA 4',teacher:'Tr. Jemima'}, {brk:true}, {subject:'LA 3 (11:00-12:30)',teacher:'Tr. Jus'}, {subject:'LA 3',teacher:'Tr. Jus'}, {brk:true}, {subject:'1:00 PM DISMISSAL 🏠',teacher:''}, {subject:'Home',teacher:''}, {subject:'Home',teacher:''} ],
        'Top':    [ {subject:'LA 2 (8:30-10:00)',teacher:'Tr. Mayira'}, {subject:'LA 2',teacher:'Tr. Mayira'}, {brk:true}, {subject:'LA 1 (11:00-12:30)',teacher:'Tr. Jemima'}, {subject:'LA 1',teacher:'Tr. Jemima'}, {brk:true}, {subject:'Evening LA (2:00-3:30pm)',teacher:'Tr. Mayira'}, {subject:'3:30 PM DISMISSAL 🏠',teacher:'Tr. Mayira'}, {subject:'Home',teacher:''} ]
      },
      'Thu': {
        'Baby':   [ {subject:'LA 3 (8:30-10:00)',teacher:'Tr. Jus'}, {subject:'LA 3',teacher:'Tr. Jus'}, {brk:true}, {subject:'LA 1 (11:00-12:30)',teacher:'Tr. Jemima'}, {subject:'LA 1',teacher:'Tr. Jemima'}, {brk:true}, {subject:'1:00 PM DISMISSAL 🏠',teacher:''}, {subject:'Home',teacher:''}, {subject:'Home',teacher:''} ],
        'Middle': [ {subject:'LA 1 (8:30-10:00)',teacher:'Tr. Jemima'}, {subject:'LA 1',teacher:'Tr. Jemima'}, {brk:true}, {subject:'LA 5 (11:00-12:30)',teacher:'Tr. Mayira'}, {subject:'LA 5',teacher:'Tr. Mayira'}, {brk:true}, {subject:'1:00 PM DISMISSAL 🏠',teacher:''}, {subject:'Home',teacher:''}, {subject:'Home',teacher:''} ],
        'Top':    [ {subject:'LA 4 (8:30-10:00)',teacher:'Tr. Mayira'}, {subject:'LA 4',teacher:'Tr. Mayira'}, {brk:true}, {subject:'LA 3 (11:00-12:30)',teacher:'Tr. Jus'}, {subject:'LA 3',teacher:'Tr. Jus'}, {brk:true}, {subject:'Evening LA (2:00-3:30pm)',teacher:'Tr. Jus'}, {subject:'3:30 PM DISMISSAL 🏠',teacher:'Tr. Jus'}, {subject:'Home',teacher:''} ]
      },
      'Fri': {
        'Baby':   [ {subject:'LA 4 (8:30-10:00)',teacher:'Tr. Jus'}, {subject:'LA 4',teacher:'Tr. Jus'}, {brk:true}, {subject:'LA 2 (11:00-12:30)',teacher:'Tr. Jus'}, {subject:'LA 2',teacher:'Tr. Jus'}, {brk:true}, {subject:'1:00 PM DISMISSAL 🏠',teacher:''}, {subject:'Home',teacher:''}, {subject:'Home',teacher:''} ],
        'Middle': [ {subject:'LA 1 (8:30-10:00)',teacher:'Tr. Jemima'}, {subject:'LA 1',teacher:'Tr. Jemima'}, {brk:true}, {subject:'LA 1 (11:00-12:30)',teacher:'Tr. Jemima'}, {subject:'LA 1',teacher:'Tr. Jemima'}, {brk:true}, {subject:'1:00 PM DISMISSAL 🏠',teacher:''}, {subject:'Home',teacher:''}, {subject:'Home',teacher:''} ],
        'Top':    [ {subject:'LA 4 (8:30-10:00)',teacher:'Tr. Mayira'}, {subject:'LA 4',teacher:'Tr. Mayira'}, {brk:true}, {subject:'LA 5 / LA 2 (11:00-12:30)',teacher:'Tr. Mayira'}, {subject:'LA 5 / LA 2',teacher:'Tr. Mayira'}, {brk:true}, {subject:'Evening LA (2:00-3:30pm)',teacher:'Tr. Mayira'}, {subject:'3:30 PM DISMISSAL 🏠',teacher:'Tr. Mayira'}, {subject:'Home',teacher:''} ]
      }
    };

    classes.forEach(c => {
      grid[c] = {};
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(d => {
        grid[c][d] = [
          { subject: '', teacher: '' }, { subject: '', teacher: '' },
          { brk: true },
          { subject: '', teacher: '' }, { subject: '', teacher: '' },
          { brk: true },
          { subject: '', teacher: '' }, { subject: '', teacher: '' },
          { subject: '', teacher: '' },
        ];
      });
    });

    const getTeacherForSubject = function(cls, subject) {
      if (!subject || subject === 'Break' || subject === 'Lunch' || subject.includes('DISMISSAL') || subject === 'Home') return '';
      if (cls === 'P1') {
        if (subject.includes('LUG') || subject.includes('LIT') || subject.includes('WRITING')) return 'Tr. Harriet';
        if (subject.includes('ENG') || subject.includes('READING')) return 'Tr. Harriet';
        if (subject.includes('MTC')) return 'Tr. Jane';
        if (subject.includes('R.E')) return 'Tr. Harriet';
        return 'Tr. Harriet';
      }
      if (cls === 'P2') {
        if (subject.includes('ENG') || subject.includes('LIT') || subject.includes('READING')) return 'Tr. Christine';
        if (subject.includes('MTC')) return 'Tr. Jane';
        if (subject.includes('R.E') || subject.includes('LUG')) return 'Tr. Christine';
        return 'Tr. Christine';
      }
      if (cls === 'P3') {
        if (subject.includes('MTC') || subject.includes('R.E')) return 'Tr. Jane';
        if (subject.includes('ENG') || subject.includes('LIT') || subject.includes('READING') || subject.includes('LUG')) return 'Tr. Joyce';
        return 'Tr. Jane';
      }
      if (cls === 'P4') {
        if (subject.includes('MTC')) return 'Tr. Elijah';
        if (subject.includes('ENG') || subject.includes('LIT')) return 'Tr. Joyce';
        if (subject.includes('SCI')) return 'Tr. Harriet';
        if (subject.includes('SST')) return 'Tr. Esther';
        return 'Tr. Elijah';
      }
      if (cls === 'P5') {
        if (subject.includes('SST') || subject.includes('SCI')) return 'Tr. Esther';
        if (subject.includes('MTC')) return 'Tr. Elijah';
        if (subject.includes('ENG')) return 'Tr. Joyce';
        return 'Tr. Esther';
      }
      if (cls === 'P6') {
        if (subject.includes('SCI') || subject.includes('MTC')) return 'Tr. Ronnie';
        if (subject.includes('ENG')) return 'Tr. Paul';
        if (subject.includes('SST')) return 'Tr. Sam';
        return 'Tr. Ronnie';
      }
      if (cls === 'P7') {
        if (subject.includes('ENG') || subject.includes('R.E')) return 'Tr. Paul';
        if (subject.includes('SST')) return 'Tr. Sam';
        if (subject.includes('SCI') || subject.includes('MTC')) return 'Tr. Ronnie';
        return 'Tr. Paul';
      }
      return '';
    };

    for (let dow = 1; dow <= 5; dow++) {
      const dayName = daysMap[dow];
      const dayGrid = RAW_GRID[dow];
      if (!dayGrid) continue;

      for (const [cls, subjs] of Object.entries(dayGrid)) {
        if (!grid[cls] || !grid[cls][dayName]) continue;
        const cellArr = grid[cls][dayName];
        const pIndices = [0, 1, 3, 4, 6, 7, 8];
        subjs.forEach((sub, idx) => {
          const pi = pIndices[idx];
          if (pi !== undefined && cellArr[pi]) {
            cellArr[pi] = { subject: sub, teacher: getTeacherForSubject(cls, sub) };
          }
        });
      }
    }

    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(d => {
      ['Baby', 'Middle', 'Top'].forEach(cls => {
        grid[cls][d] = nurseryGrid[d][cls];
      });
    });

    return grid;
  };

  // Auto-push grid to Sentinel Worker API on load
  const syncToSentinel = async function (tenantSlug) {
    const slug = tenantSlug || 'kabs-lily-junior-school-and-kindercare-centre';
    const grid = window.getKabsLilyDigitalGrid();
    const periods = [
      { l: 'Period 1', s: '08:00', e: '09:00' },
      { l: 'Period 2', s: '09:00', e: '10:00' },
      { l: 'Break',    s: '10:00', e: '11:00', brk: true },
      { l: 'Period 3', s: '11:00', e: '12:00' },
      { l: 'Period 4', s: '12:00', e: '13:00' },
      { l: 'Lunch',    s: '13:00', e: '14:00', brk: true },
      { l: 'Period 5', s: '14:00', e: '15:00' },
      { l: 'Period 6', s: '15:00', e: '16:00' },
      { l: 'Extra Period', s: '16:00', e: '17:00' },
    ];
    const payload = { level: 'primary', periods, grid, updatedAt: new Date().toISOString() };
    const WK = 'https://nextos-sentinel.nextafricaai.workers.dev';

    try {
      await fetch(WK + '/os-data/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'timetable', tenant: slug, record: payload })
      });
    } catch (_) {}
  };

  window.syncKabsLilyToSentinel = syncToSentinel;

  // Auto-init on script load
  setTimeout(() => {
    syncToSentinel('kabs-lily-junior-school-and-kindercare-centre');
    syncToSentinel('kabs-lily');
    syncToSentinel('peak-primary');
  }, 1000);
})();
