/* os-childcare.jsx — Amani OS Panel
   Renders as a full NEXT OS page when the 'childcare' tab is active.
   Supervised by Nia. Data mirrors os-data.jsx charis-childcare tenant.
*/

console.log("os-childcare.jsx is executing!");

(function () {

  // ── Childcare data seed (mirrors os-data.jsx verticalKpis) ──────────────
  
  const CENTERS = [
    {
      id: 'charis-kampala',
      name: 'Kampala Branch',
      kpi: {
        enrolled: 24, presentToday: 21, absentToday: 3,
        attendanceRate: 0.875, caretakers: 3, activeParents: 20,
        invoicesDue: 3, invoicesOverdue30d: 1, overdueAmount: 300000,
        totalInvoiced: 2100000, collectionRate: 0.857,
        unreadParentMessages: 5, unansweredMessages24h: 2,
        milestonesThisWeek: 7, activitiesScheduledToday: 4,
      },
      children: [
        { id: 1,  name: 'Aiden Nakamya',   age: 3, mood: '😊', present: true,  nap: false, milestone: 'First full sentence',   invoiceStatus: 'overdue',  parent: 'Mrs. Nakamya',   parentPhone: '256772001001', photoUrl: 'https://i.pravatar.cc/150?u=1', allergies: 'Peanuts', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)', 'Measles 2 / DPT Booster'], birthday: '2023-05-14', height: '95 cm', weight: '14.2 kg', activeScore: 850, favouriteMeals: 'Mac & Cheese', enrollmentDate: '2024-01-10', healthRecord: 'Asthma (mild). Uses inhaler when needed.', carePlan: 'monthly' },
        { id: 2,  name: 'Bella Okello',    age: 2, mood: '😴', present: true,  nap: true,  milestone: 'Counting to 10',         invoiceStatus: 'paid',     parent: 'Ms. Okello',     parentPhone: '256772001002', photoUrl: 'https://i.pravatar.cc/150?u=2', allergies: 'None', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'DPT 3', 'Pneumococcal 3'], birthday: '2024-02-10', height: '88 cm', weight: '12.5 kg', activeScore: 620, favouriteMeals: 'Mashed Potatoes, Fish', enrollmentDate: '2025-03-01', healthRecord: 'No known chronic conditions. Prone to eczema.', carePlan: 'daily' },
        { id: 3,  name: 'Caleb Ssemanda',  age: 4, mood: '😄', present: true,  nap: false, milestone: 'Drawing shapes',         invoiceStatus: 'paid',     parent: 'Mr. Ssemanda',   parentPhone: '256772001003', photoUrl: 'https://i.pravatar.cc/150?u=3', allergies: 'Dairy (Lactose Intolerant)', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)', 'Measles 2 / DPT Booster'], birthday: '2022-11-05', height: '102 cm', weight: '16.0 kg', activeScore: 1120, favouriteMeals: 'Chicken Stew, Rice', enrollmentDate: '2023-09-15', healthRecord: 'Lactose intolerance requires soy/almond milk substitutes.', carePlan: 'monthly' },
        { id: 4,  name: 'Daisy Mutebe',    age: 3, mood: '😢', present: false, nap: false, milestone: null,                     invoiceStatus: 'due',      parent: 'Mrs. Mutebe',    parentPhone: '256772001004', photoUrl: 'https://i.pravatar.cc/150?u=4', allergies: 'None', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)', 'Measles 2 / DPT Booster'], birthday: '2023-08-20', height: '92 cm', weight: '13.8 kg', activeScore: 780, favouriteMeals: 'Spaghetti, Bananas', enrollmentDate: '2024-05-20', healthRecord: 'Currently home sick with mild fever.', carePlan: 'monthly' },
        { id: 5,  name: 'Ethan Lubega',    age: 2, mood: '😊', present: true,  nap: false, milestone: 'Walking stairs alone',   invoiceStatus: 'paid',     parent: 'Mr. Lubega',     parentPhone: '256772001005', photoUrl: 'https://i.pravatar.cc/150?u=5', allergies: 'Eggs', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever'], birthday: '2024-01-30', height: '86 cm', weight: '12.1 kg', activeScore: 590, favouriteMeals: 'Oatmeal, Apples', enrollmentDate: '2025-01-10', healthRecord: 'Egg allergy causes hives. EpiPen in nurse station.', carePlan: 'daily' },
        { id: 6,  name: 'Fiona Atim',      age: 4, mood: '😄', present: true,  nap: false, milestone: 'Reading own name',       invoiceStatus: 'paid',     parent: 'Ms. Atim',       parentPhone: '256772001006', photoUrl: 'https://i.pravatar.cc/150?u=6', allergies: 'None', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)', 'Measles 2 / DPT Booster'], birthday: '2022-12-12', height: '105 cm', weight: '17.5 kg', activeScore: 1250, favouriteMeals: 'Matooke and G-nut sauce', enrollmentDate: '2023-10-01', healthRecord: 'Perfect health record.', carePlan: 'monthly' },
        { id: 7,  name: 'Grace Wamala',    age: 3, mood: '😊', present: true,  nap: true,  milestone: 'Sharing during play',    invoiceStatus: 'due',      parent: 'Mrs. Wamala',    parentPhone: '256772001007', photoUrl: 'https://i.pravatar.cc/150?u=7', allergies: 'None', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)'], birthday: '2023-04-18', height: '94 cm', weight: '14.0 kg', activeScore: 810, favouriteMeals: 'Rice, Beans', enrollmentDate: '2024-08-15', healthRecord: 'Minor hearing issue in left ear, under observation.', carePlan: 'monthly' },
        { id: 8,  name: 'Henry Kato',      age: 2, mood: '😴', present: true,  nap: true,  milestone: null,                     invoiceStatus: 'paid',     parent: 'Mr. Kato',       parentPhone: '256772001008', photoUrl: 'https://i.pravatar.cc/150?u=8', allergies: 'None', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)'], birthday: '2024-03-05', height: '89 cm', weight: '13.2 kg', activeScore: 640, favouriteMeals: 'Yogurt, Toast', enrollmentDate: '2025-04-01', healthRecord: 'Generally healthy.', carePlan: 'daily' },
        { id: 9,  name: 'Ivy Kyomuhendo',  age: 4, mood: '😄', present: true,  nap: false, milestone: 'Puzzle (12 pieces)',     invoiceStatus: 'paid',     parent: 'Ms. Kyomuhendo', parentPhone: '256772001009', photoUrl: 'https://i.pravatar.cc/150?u=9', allergies: 'Dust', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)', 'Measles 2 / DPT Booster'], birthday: '2022-09-22', height: '108 cm', weight: '18.1 kg', activeScore: 1320, favouriteMeals: 'Chapati, Beef stew', enrollmentDate: '2023-08-01', healthRecord: 'Allergic to severe dust. Avoid dusty playground areas.', carePlan: 'monthly' },
        { id: 10, name: 'Joel Byaruhanga', age: 3, mood: '😊', present: false, nap: false, milestone: null,                     invoiceStatus: 'paid',     parent: 'Mr. Byaruhanga', parentPhone: '256772001010', photoUrl: 'https://i.pravatar.cc/150?u=10', allergies: 'None', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)', 'Measles 2 / DPT Booster'], birthday: '2023-07-11', height: '93 cm', weight: '14.5 kg', activeScore: 750, favouriteMeals: 'Pancakes, Mangoes', enrollmentDate: '2024-06-15', healthRecord: 'Recovering from minor cold.', carePlan: 'monthly' },
        { id: 11, name: 'Liam Kazibwe',    age: 5, mood: '🎓', present: false, nap: false, milestone: 'Graduated to Primary', invoiceStatus: 'paid',     parent: 'Mrs. Kazibwe',   parentPhone: '256772001011', photoUrl: 'https://i.pravatar.cc/150?u=11', allergies: 'None', completedVaccines: [], birthday: '2021-02-14', height: '110 cm', weight: '19.0 kg', activeScore: 0, favouriteMeals: 'Sandwiches', enrollmentDate: '2022-01-10', healthRecord: 'Graduated perfectly healthy.', carePlan: 'monthly', isAlumni: true },
      ],
      schedule: [
        { time: '07:30', activity: 'Arrival & Free Play',               caretaker: 'Ms. Maria L.',   icon: '🌅', color: 'var(--mint)' },
        { time: '09:00', activity: 'Morning Circle & Songs',            caretaker: 'Ms. Maria L.',   icon: '🎵', color: 'var(--warning)' },
        { time: '09:30', activity: 'Structured Learning — Letters',     caretaker: 'Ms. Faith A.',   icon: '📚', color: 'var(--info)' },
        { time: '10:30', activity: 'Snack Time',                        caretaker: 'All caretakers', icon: '🍎', color: 'var(--gold)' },
        { time: '11:00', activity: 'Creative Arts & Craft',             caretaker: 'Ms. Ruth K.',    icon: '🎨', color: '#F43F5E' },
        { time: '12:00', activity: 'Lunch',                             caretaker: 'All caretakers', icon: '🍽️', color: '#10B981' },
        { time: '12:45', activity: 'Nap Time',                          caretaker: 'Ms. Maria L.',   icon: '😴', color: '#6366F1' },
        { time: '14:00', activity: 'Outdoor Play & Story Time',         caretaker: 'Ms. Faith A.',   icon: '🌳', color: 'var(--mint)' },
        { time: '15:00', activity: 'Parent Pick-up Window',             caretaker: 'All caretakers', icon: '🚗', color: 'var(--gold)' },
      ],
      messages: [
        { id: 1, parent: 'Mrs. Nakamya',  time: '8:42 AM',  text: 'Will pick up Aiden at 2pm today, please note.',          read: false, answered: false },
        { id: 2, parent: 'Ms. Okello',    time: '9:15 AM',  text: 'Bella is feeling better, thanks for yesterday\'s care!', read: true,  answered: true  },
        { id: 3, parent: 'Mr. Ssemanda',  time: '9:50 AM',  text: 'Can you share today\'s activity photos on WhatsApp?',    read: false, answered: false },
        { id: 4, parent: 'Mrs. Mutebe',   time: '10:20 AM', text: 'Daisy is home sick today, she has a mild fever.',        read: true,  answered: true  },
        { id: 5, parent: 'Mr. Lubega',    time: '11:05 AM', text: 'Please give Ethan his medication at 1pm. Thanks.',       read: false, answered: false },
      ],
      cameras: [
        { id: 'cam1', mjpegUrl: 'http://t92hudson%40gmail.com:Mbarara1@192.168.1.100/Streaming/channels/102/httppreview', name: 'Playroom A - North View', source: 'camera_mock_1', children: [{ name: 'Ivy Kyomuhendo', milestone: 'Puzzle (12 pieces)', x: 60, y: 40 }, { name: 'Aiden Nakamya', milestone: 'First full sentence', x: 20, y: 70 }] },
        { id: 'cam2', mjpegUrl: 'http://t92hudson%40gmail.com:Mbarara1@192.168.1.100/Streaming/channels/202/httppreview', name: 'Nap Area - East Wing', source: 'camera_mock_2', children: [{ name: 'Henry Kato', milestone: 'Sleeping calmly', x: 40, y: 50 }] },
      ]
    },
    {
      id: 'charis-gulu',
      name: 'Gulu Branch',
      kpi: {
        enrolled: 18, presentToday: 15, absentToday: 3,
        attendanceRate: 0.833, caretakers: 2, activeParents: 15,
        invoicesDue: 2, invoicesOverdue30d: 0, overdueAmount: 150000,
        totalInvoiced: 1500000, collectionRate: 0.900,
        unreadParentMessages: 2, unansweredMessages24h: 0,
        milestonesThisWeek: 4, activitiesScheduledToday: 3,
      },
      children: [
        { id: 11,  name: 'David Ocen',   age: 3, mood: '😊', present: true,  nap: false, milestone: 'First full sentence',   invoiceStatus: 'paid',  parent: 'Mr. Ocen',   parentPhone: '256772001020', photoUrl: 'https://i.pravatar.cc/150?u=11', allergies: 'None', completedVaccines: ['BCG', 'Polio 0'], birthday: '2023-01-14', height: '95 cm', weight: '14.2 kg', activeScore: 850, favouriteMeals: 'Posho', enrollmentDate: '2024-01-10', healthRecord: 'Healthy', carePlan: 'monthly' },
        { id: 12,  name: 'Sarah Laker',    age: 2, mood: '😴', present: true,  nap: true,  milestone: 'Counting to 10',         invoiceStatus: 'paid',     parent: 'Mrs. Laker',     parentPhone: '256772001021', photoUrl: 'https://i.pravatar.cc/150?u=12', allergies: 'Dust', completedVaccines: ['BCG', 'Polio 0', 'Polio 1'], birthday: '2024-02-10', height: '88 cm', weight: '12.5 kg', activeScore: 620, favouriteMeals: 'Beans', enrollmentDate: '2025-03-01', healthRecord: 'Asthma', carePlan: 'daily' },
      ],
      schedule: [
        { time: '08:00', activity: 'Arrival & Free Play',               caretaker: 'Mr. Opiyo',   icon: '🌅', color: 'var(--mint)' },
        { time: '12:00', activity: 'Lunch',                             caretaker: 'All caretakers', icon: '🍽️', color: '#10B981' },
      ],
      messages: [
        { id: 6, parent: 'Mr. Ocen',  time: '8:42 AM',  text: 'Will pick up David early today.',          read: false, answered: false },
      ],
      cameras: [
        { id: 'cam3', wsPort: null, name: 'Gulu Playroom', source: 'camera_mock_3', children: [{ name: 'Sarah Laker', milestone: 'Playing', x: 60, y: 40 }] },
      ]
    }
  ];

  const UNEPI_SCHEDULE = [
    { name: 'BCG', ageWeeks: 0 },
    { name: 'Polio 0', ageWeeks: 0 },
    { name: 'Polio 1', ageWeeks: 6 },
    { name: 'DPT 1', ageWeeks: 6 },
    { name: 'Pneumococcal 1', ageWeeks: 6 },
    { name: 'Rotavirus 1', ageWeeks: 6 },
    { name: 'Polio 2', ageWeeks: 10 },
    { name: 'DPT 2', ageWeeks: 10 },
    { name: 'Pneumococcal 2', ageWeeks: 10 },
    { name: 'Rotavirus 2', ageWeeks: 10 },
    { name: 'Polio 3', ageWeeks: 14 },
    { name: 'DPT 3', ageWeeks: 14 },
    { name: 'Pneumococcal 3', ageWeeks: 14 },
    { name: 'Measles 1', ageWeeks: 39 },
    { name: 'Yellow Fever', ageWeeks: 39 },
    { name: 'MMR (Optional)', ageWeeks: 52 },
    { name: 'Varicella (Optional)', ageWeeks: 52 },
    { name: 'Measles 2 / DPT Booster', ageWeeks: 78 }
  ];

  function calculateVaccineStatus(child) {
    if (!child.birthday) return { progress: 0, due: [], upcoming: [], requiredTotal: 0, completedCount: 0 };
    const bday = new Date(child.birthday);
    if (isNaN(bday)) return { progress: 0, due: [], upcoming: [], requiredTotal: 0, completedCount: 0 };
    const weeksOld = Math.floor((Date.now() - bday.getTime()) / (1000 * 60 * 60 * 24 * 7));
    
    let requiredTotal = 0;
    let completedCount = 0;
    const due = [];
    const upcoming = [];
    const completed = child.completedVaccines || [];
    
    UNEPI_SCHEDULE.forEach(v => {
      const isCompleted = completed.includes(v.name);
      if (weeksOld >= v.ageWeeks) {
        requiredTotal++;
        if (isCompleted) {
          completedCount++;
        } else {
          due.push(v.name);
        }
      } else if (v.ageWeeks - weeksOld <= 4) {
        if (!isCompleted) upcoming.push(v.name);
      }
    });
    
    const progress = requiredTotal === 0 ? 100 : Math.round((completedCount / requiredTotal) * 100);
    return { progress, requiredTotal, completedCount, due, upcoming };
  }




  // ── Amani Finance Module Data ───────────────────────────────────────────
  const CHART_OF_ACCOUNTS = {
    // Income
    4100: { code: '4100', name: 'Care fees - full day', type: 'Income' },
    4110: { code: '4110', name: 'Care fees - half day', type: 'Income' },
    4190: { code: '4190', name: 'Other income', type: 'Income' },
    // Cost of care
    5100: { code: '5100', name: 'Food & milk', type: 'Cost of care' },
    5120: { code: '5120', name: 'Learning materials & toys', type: 'Cost of care' },
    // Staff
    6100: { code: '6100', name: 'Salaries gross', type: 'Staff' },
    6110: { code: '6110', name: 'NSSF employer contribution', type: 'Staff' },
    // Premises & Utilities
    6600: { code: '6600', name: 'Rent', type: 'Premises' },
    6610: { code: '6610', name: 'Electricity', type: 'Premises' },
    // Admin
    7100: { code: '7100', name: 'Licences & permits', type: 'Admin' },
    // Assets
    1100: { code: '1100', name: 'Cash - bank', type: 'Asset' },
    1110: { code: '1110', name: 'Cash - MTN MoMo', type: 'Asset' },
    1200: { code: '1200', name: 'Accounts receivable (parents)', type: 'Asset' },
    1300: { code: '1300', name: 'Fixed assets', type: 'Asset' },
    // Liabilities
    2100: { code: '2100', name: 'Accounts payable', type: 'Liability' },
    2300: { code: '2300', name: 'Investor loans', type: 'Liability' },
    2400: { code: '2400', name: 'Parent prepayments', type: 'Liability' },
    // Equity
    3100: { code: '3100', name: 'Share capital / investor contributions', type: 'Equity' },
    3200: { code: '3200', name: 'Retained earnings', type: 'Equity' }
  };

  const INITIAL_LEDGER = [
    { id: 'le-1', date: '2026-07-01', memo: 'Investor Capital (Shalua)', centerId: 'all', lines: [
        { account: '1100', debit: 5000000, credit: 0 },
        { account: '3100', debit: 0, credit: 5000000 }
      ], fundedByCapital: false },
    { id: 'le-2', date: '2026-07-02', memo: 'Rent payment (Kampala)', centerId: 'charis-kampala', lines: [
        { account: '6600', debit: 1200000, credit: 0 },
        { account: '1100', debit: 0, credit: 1200000 }
      ], fundedByCapital: true },
    { id: 'le-3', date: '2026-07-05', memo: 'Fees Received (Aiden Nakamya)', centerId: 'charis-kampala', lines: [
        { account: '1110', debit: 87500, credit: 0 },
        { account: '1200', debit: 0, credit: 87500 }
      ], fundedByCapital: false },
    { id: 'le-4', date: '2026-07-08', memo: 'Toys purchase', centerId: 'charis-kampala', lines: [
        { account: '5120', debit: 350000, credit: 0 },
        { account: '1110', debit: 0, credit: 350000 }
      ], fundedByCapital: true }
  ];

  const INVESTOR_DATA = {
    name: 'Shalua',
    contributed: 5000000,
    totalEquity: 5000000,
    type: 'equity'
  };


  function getCurrentTimeSlot(schedule) {
    if (!schedule || !schedule.length) return -1;
    const now = new Date();
    const hhmm = now.getHours() * 60 + now.getMinutes();
    for (let i = 0; i < schedule.length - 1; i++) {
      const [ah, am] = schedule[i].time.split(':').map(Number);
      const [bh, bm] = schedule[i + 1].time.split(':').map(Number);
      if (hhmm >= ah * 60 + am && hhmm < bh * 60 + bm) return i;
    }
    return -1;
  }

  // ── KPI Card Component ───────────────────────────────────────────────────
  const CcKpiCard = ({ label, value, sub, accent, icon }) => (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      borderRadius: "var(--radius-md)", padding: '20px 22px', flex: 1, minWidth: 140,
      position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s',
    }} className="kpi-card">
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 70, height: 70,
        borderRadius: '50%', background: accent, opacity: 0.08, filter: 'blur(20px)',
      }} />
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{sub}</div>}
    </div>
  );

  // ── Child Card Component ─────────────────────────────────────────────────
  const ChildCard = ({ child, onSelect, onMessage }) => {
    const statusColor = child.present ? 'var(--mint)' : 'var(--danger)';
    const invoiceColor = child.invoiceStatus === 'overdue' ? 'var(--danger)' : child.invoiceStatus === 'due' ? 'var(--gold)' : 'var(--mint)';
    return (
      <div onClick={() => onSelect(child)} style={{
        background: 'var(--bg-elevated)', border: `1px solid ${child.present ? 'var(--border-subtle)' : 'rgba(239,71,111,0.2)'}`,
        borderRadius: "var(--radius-md)", padding: '16px', display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s', cursor: 'pointer',
      }} className="kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: `url(${child.photoUrl}) center/cover`, border: `2px solid ${statusColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}></div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{child.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{child.age} yrs · {child.parent}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {child.present ? (child.nap ? '😴 Napping' : '✓ Present') : '✗ Absent'}
            </div>
            <div style={{ fontSize: 10, color: invoiceColor, marginTop: 2, textTransform: 'uppercase' }}>
              {child.invoiceStatus === 'overdue' ? '⚠ Overdue' : child.invoiceStatus === 'due' ? '○ Due' : '✓ Paid'}
            </div>
            <div style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: 4, display: 'inline-block', marginTop: 4, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {child.carePlan === 'monthly' ? '📅 Monthly' : child.carePlan === 'weekly' ? '📅 Weekly' : '🗓️ Daily'}
            </div>
          </div>
        </div>
        {child.milestone && (
          <div style={{ background: 'rgba(6,214,160,0.06)', border: '1px solid rgba(6,214,160,0.15)', borderRadius: "var(--radius-sm)", padding: '6px 10px', fontSize: 11, color: 'var(--mint)' }}>
            🏆 Milestone: {child.milestone}
          </div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onMessage(child); }} style={{
          background: 'transparent', border: '1px solid var(--border-default)', borderRadius: "var(--radius-sm)",
          padding: '6px 10px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
        }} className="quick-action-btn">
          <span>💬</span> Message {child.parent.split(' ')[1] || child.parent}
        </button>
      </div>
    );
  };

  // ── Nia Profile Brief Component ──────────────────────────────────────────
  const NiaProfileBrief = ({ child }) => {
    const [brief, setBrief] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
      let isMounted = true;
      setLoading(true);
      setError(null);

      const fetchBrief = async () => {
        try {
          const vac = typeof calculateVaccineStatus !== 'undefined' ? calculateVaccineStatus(child) : {};
          const systemPrompt = `You are Nia, the AI Chief of Staff for Amani. You are analyzing a child's profile to assist the childcare staff.
Child Name: ${child.name}
Age: ${child.age}
Allergies: ${child.allergies}
Health Record: ${child.healthRecord}
Overdue Vaccines: ${vac.due ? vac.due.join(', ') : 'None'}
Recent Milestone: ${child.milestone || 'None recorded recently'}
Favorite Meals: ${child.favouriteMeals}

Your task: Provide a brief, professional, and actionable 2-sentence assessment. Highlight critical things like allergies or missing vaccines immediately. Do not use markdown headers, just plain text or simple bullet points if necessary.`;

          const res = await fetch('https://nextos-sentinel.nextafricaai.workers.dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system: systemPrompt,
              messages: [{ role: 'user', content: 'Provide the profile assessment for ' + child.name }],
              tools: []
            })
          });
          const apiData = await res.json();
          if (!res.ok) throw new Error(apiData.error || 'Failed to fetch assessment');
          
          const textRespObj = (apiData.content || []).find(c => c.type === 'text');
          const textResp = (textRespObj && textRespObj.text) || "Assessment unavailable.";
          
          if (isMounted) {
            setBrief(textResp);
            setLoading(false);
          }
        } catch (err) {
          if (isMounted) {
            setError(err.message);
            setLoading(false);
          }
        }
      };

      fetchBrief();

      return () => { isMounted = false; };
    }, [child]);

    return (
      <div style={{ background: 'var(--bg-deepest)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: 'var(--mint)' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--mint), var(--emerald))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🛡️</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--mint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nia's Assessment</div>
        </div>
        
        {loading ? (
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite opacity' }}>●</span> Analyzing profile data...
          </div>
        ) : error ? (
          <div style={{ fontSize: 14, color: 'var(--danger)' }}>Unable to load Nia's assessment: {error}</div>
        ) : (
          <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {brief}
          </div>
        )}
      </div>
    );
  };

  // ── Child Profile View Component ─────────────────────────────────────────
  const ChildProfileView = ({ child, onBack, onMessage }) => {
    const [windowWidth] = useWindowSize();
    const isMobile = windowWidth < 768;
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)' }}>
          <span>←</span> Back to Roster
        </button>
        
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-lg)", padding: isMobile ? '20px' : '32px 40px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 24 : 40 }}>
          {/* Left Column: Photo & Base Info */}
          <div style={{ width: isMobile ? '100%' : 220, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: 140, height: 140, borderRadius: '50%', background: `url(${child.photoUrl}) center/cover`, border: `4px solid ${child.present ? 'var(--mint)' : 'var(--border-default)'}`, marginBottom: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{child.name}</h2>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>{child.age} Years Old</div>
            
            <div style={{ background: 'var(--bg-deep)', borderRadius: "var(--radius-md)", padding: '12px', width: '100%', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Parent / Guardian</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{child.parent}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{child.parentPhone}</div>
            </div>
            
            <button onClick={() => onMessage(child)} style={{ background: 'var(--mint)', color: 'var(--bg-deepest)', border: 'none', borderRadius: "var(--radius-sm)", padding: '12px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', fontFamily: 'var(--font-body)', marginBottom: 16 }}>
              Message Parent
            </button>
            
            <div style={{ background: 'var(--bg-deep)', borderRadius: "var(--radius-md)", padding: '12px', width: '100%', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Log Milestone</div>
              <input type="text" id={`milestone-text-${child.id}`} placeholder="e.g. Counted to 10!" style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }} />
              <button onClick={async () => {
                const input = document.getElementById(`milestone-text-${child.id}`);
                const ms = input.value;
                if (!ms) return;
                
                // Update local state so it appears in Parent App immediately
                const updatedChild = { ...child, milestone: ms, milestoneTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
                if (onUpdateChild) onUpdateChild(updatedChild);
                
                try {
                   await window.supabase.createClient('https://eztgwiujujaxswlslqbf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dGd3aXVqdWpheHN3bHNscWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzE5NjEsImV4cCI6MjA5ODc0Nzk2MX0.mzyC4DLlC-s3YznfQLTfNxa227_hQlLAt0VhL_dGxr0').from('children').update({ milestone: ms }).eq('id', child.id);
                } catch(e) { console.error(e); }
                input.value = '';
                alert('Milestone Logged! Parent will be notified via Agent Nia.');
              }} style={{ background: 'transparent', color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 6, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                Log Milestone
              </button>
            </div>
            
            <div style={{ background: 'var(--bg-deep)', borderRadius: "var(--radius-md)", padding: '12px', width: '100%' }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Agent Nia Automation</div>
              <input type="text" id={`gallery-url-${child.id}`} placeholder="Paste Image URL" style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-default)', color: 'var(--text-primary)', fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }} />
              <button onClick={async () => {
                const url = document.getElementById(`gallery-url-${child.id}`).value;
                if (!url) return;
                try {
                   const gallery = child.gallery || [];
                   const newGallery = [url, ...gallery];
                   await window.supabase.createClient('https://eztgwiujujaxswlslqbf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dGd3aXVqdWpheHN3bHNscWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzE5NjEsImV4cCI6MjA5ODc0Nzk2MX0.mzyC4DLlC-s3YznfQLTfNxa227_hQlLAt0VhL_dGxr0').from('children').update({ gallery: newGallery }).eq('id', child.id);
                   document.getElementById(`gallery-url-${child.id}`).value = '';
                   alert('Sent! Parent will be notified via Agent Nia.');
                } catch(e) { console.error(e); }
              }} style={{ background: 'transparent', color: 'var(--mint)', border: '1px solid var(--mint)', borderRadius: 6, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                Send to Parent Gallery
              </button>
            </div>
          </div>
          
          {/* Right Column: Detailed Vitals & Health */}
          <div style={{ flex: 1 }}>
            <NiaProfileBrief child={child} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, marginBottom: 20, marginTop: 0 }}>Vital Information</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Birthday', val: child.birthday },
                { label: 'Height', val: child.height },
                { label: 'Weight', val: child.weight },
                { label: 'Active Score', val: child.activeScore + ' pts', color: 'var(--mint)' },
              ].map(v => (
                <div key={v.label} style={{ background: 'var(--bg-deep)', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{v.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: v.color || 'var(--text-primary)' }}>{v.val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div style={{ background: child.allergies !== 'None' ? 'rgba(239,71,111,0.05)' : 'var(--bg-deep)', border: child.allergies !== 'None' ? '1px solid rgba(239,71,111,0.2)' : '1px solid var(--border-subtle)', borderRadius: 10, padding: '16px' }}>
                <div style={{ fontSize: 12, color: child.allergies !== 'None' ? 'var(--danger)' : 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 600 }}>Allergies</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{child.allergies}</div>
              </div>
              <div style={{ background: 'var(--bg-deep)', borderRadius: 10, padding: '16px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Immunisation Tracker</div>
                {(() => {
                  const vac = calculateVaccineStatus(child);
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Completed</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{vac.progress}%</span>
                      </div>
                      <div style={{ background: 'var(--bg-default)', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                        <div style={{ background: vac.progress === 100 ? 'var(--mint)' : 'var(--warning)', width: vac.progress + '%', height: '100%' }}></div>
                      </div>
                      {vac.due.length > 0 && (
                        <div style={{ background: 'rgba(255,209,102,0.1)', border: '1px solid rgba(255,209,102,0.3)', borderRadius: 6, padding: '8px 10px', marginTop: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, display: 'block', marginBottom: 2 }}>⚠️ Overdue Vaccines</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{vac.due.join(', ')}</span>
                        </div>
                      )}
                      {vac.upcoming.length > 0 && (
                        <div style={{ background: 'rgba(17,138,178,0.1)', border: '1px solid rgba(17,138,178,0.3)', borderRadius: 6, padding: '8px 10px', marginTop: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--info)', fontWeight: 600, display: 'block', marginBottom: 2 }}>⏳ Upcoming (Next 4 Weeks)</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{vac.upcoming.join(', ')}</span>
                        </div>
                      )}
                      {vac.due.length === 0 && vac.upcoming.length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--mint)' }}>✅ Up to date</div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, marginBottom: 20, marginTop: 24 }}>Weekly Curriculum</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--bg-deep)', padding: 16, borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Theme of the Week</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Community Helpers (Doctors, Firefighters, Teachers)</div>
              </div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20 }}>
                <div style={{ flex: 1, background: 'var(--bg-deep)', padding: 16, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Faith Focus</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>📖 "Love one another."</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>🕊️ The Good Samaritan</div>
                </div>
                <div style={{ flex: 1, background: 'var(--bg-deep)', padding: 16, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Core Activity</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>🎨 Role-playing & Card Making</div>
                </div>
              </div>
            </div>

            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, marginBottom: 20, marginTop: 24 }}>Health Record & Notes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--bg-deep)', padding: 16, borderRadius: 10 }}>
                {child.healthRecord}
              </div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20 }}>
                <div style={{ flex: 1, background: 'var(--bg-deep)', padding: 16, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Favourite Meals</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>🍽️ {child.favouriteMeals}</div>
                </div>
                <div style={{ flex: 1, background: 'var(--bg-deep)', padding: 16, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Enrollment Date</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>📅 {child.enrollmentDate}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Nia Advisory Banner ──────────────────────────────────────────────────
  const NiaAdvisoryBanner = ({ onTalkToNia }) => {
    const [windowWidth] = useWindowSize();
    const isMobile = windowWidth < 768;
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(6,214,160,0.06) 0%, rgba(6,214,160,0.02) 100%)',
        border: '1px solid rgba(6,214,160,0.2)', borderRadius: "var(--radius-md)", padding: '16px 20px',
        display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16,
        marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--mint), var(--emerald))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 0 16px rgba(6,214,160,0.3)',
            flexShrink: 0
          }}>🛡️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mint)' }}>Nia is watching Childcare OS</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              2 parent messages unanswered · Nakamya invoice 30+ days overdue · 3 children absent today
            </div>
          </div>
        </div>
        <button onClick={onTalkToNia} style={{
          background: 'var(--mint)', color: 'var(--bg-deepest)', border: 'none', borderRadius: "var(--radius-sm)",
          padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          whiteSpace: 'nowrap', fontFamily: 'var(--font-body)', width: isMobile ? '100%' : 'auto'
        }}>Talk to Nia →</button>
      </div>
    );
  };

  // ── Nia AI Chat Overlay ──────────────────────────────────────────────────
  const ChildcareNiaOverlay = ({ isOpen, onClose, contextData }) => {
    const [messages, setMessages] = React.useState([{ role: 'assistant', content: 'Hello Hudson. I am monitoring Amani OS. What do you need to know?' }]);
    const [input, setInput] = React.useState('');
    const [pending, setPending] = React.useState(false);
    const messagesEndRef = React.useRef(null);

    React.useEffect(() => {
      if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!isOpen) return null;

    const handleSend = async () => {
      if (!input.trim() || pending) return;
      const userMsg = { role: 'user', content: input.trim() };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setPending(true);

      const rosterStr = JSON.stringify(contextData.children.map(c => {
        const vac = typeof calculateVaccineStatus !== 'undefined' ? calculateVaccineStatus(c) : {};
        return { name: c.name, age: c.age, present: c.present, nap: c.nap, milestone: c.milestone, invoice: c.invoiceStatus, healthRecord: c.healthRecord, allergies: c.allergies, overdueVaccines: vac.due || [], upcomingVaccines: vac.upcoming || [], completedVaccines: c.completedVaccines, favouriteMeals: c.favouriteMeals, birthday: c.birthday, height: c.height, weight: c.weight, activeScore: c.activeScore, enrollmentDate: c.enrollmentDate };
      }));
      const scheduleStr = JSON.stringify(contextData.schedule.map(s => ({ time: s.time, activity: s.activity, caretaker: s.caretaker })));
      const messagesStr = JSON.stringify(contextData.messages);
      const kpiStr = JSON.stringify(contextData.kpi);

      const systemPrompt = `You are Nia, the AI Chief of Staff for NEXT OS. You are currently viewing the Amani OS dashboard for Hudson Tumusiime (Global Director).
You have complete access to the current dashboard state. Answer the user's questions based ONLY on this data. Be concise, direct, and helpful. Do not use markdown headers.

CURRENT DASHBOARD STATE:
KPIs: ${kpiStr}
CHILDREN ROSTER: ${rosterStr}
TODAY'S SCHEDULE: ${scheduleStr}
MESSAGES FROM PARENTS: ${messagesStr}`;

      try {
        const res = await fetch('https://nextos-sentinel.nextafricaai.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: systemPrompt,
            messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
            tools: []
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch');
        
        const textRespObj = (data.content || []).find(c => c.type === 'text');
        const textResp = (textRespObj && textRespObj.text) || "I'm sorry, I couldn't process that.";
        setMessages(prev => [...prev, { role: 'assistant', content: textResp }]);
      } catch (err) {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error connecting to Nia: ' + err.message }]);
      } finally {
        setPending(false);
      }
    };

    return (
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, background: 'var(--bg-elevated)', borderLeft: '1px solid var(--border-default)', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', zIndex: 1000 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--mint), var(--emerald))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
            <div style={{ fontWeight: 700, color: 'var(--mint)' }}>Nia Advisory</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 24, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                {m.role === 'user' ? 'Hudson' : 'Nia'}
              </div>
              <div style={{ background: m.role === 'user' ? 'var(--mint)' : 'var(--bg-surface)', color: m.role === 'user' ? 'var(--bg-deepest)' : 'var(--text-primary)', padding: '10px 14px', borderRadius: "var(--radius-md)", borderBottomRightRadius: m.role === 'user' ? 2 : 12, borderBottomLeftRadius: m.role === 'user' ? 12 : 2, fontSize: 13, lineHeight: 1.5 }}>
                {m.content}
              </div>
            </div>
          ))}
          {pending && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: "var(--radius-md)", fontSize: 13, color: 'var(--text-tertiary)' }}>
              Nia is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div style={{ padding: 20, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask Nia about the dashboard..." style={{ flex: 1, background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: "var(--radius-sm)", padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
            <button onClick={handleSend} disabled={pending || !input.trim()} style={{ background: 'var(--mint)', color: 'var(--bg-deepest)', border: 'none', borderRadius: "var(--radius-sm)", padding: '0 16px', fontWeight: 700, cursor: (pending || !input.trim()) ? 'not-allowed' : 'pointer', opacity: (pending || !input.trim()) ? 0.5 : 1 }}>Send</button>
          </div>
        </div>
      </div>
    );
  };

  
  const INITIAL_GLOBAL_MESSAGES = [
    { id: 101, threadId: 'parent-nakamya', fromRole: 'parent', fromName: 'Mrs. Nakamya', toRole: 'manager', toName: 'Manager', branchId: 'charis-kampala', text: 'Aiden will be late today.', time: '8:00 AM' },
    { id: 102, threadId: 'director-investor', fromRole: 'investor', fromName: 'Investor Group', toRole: 'director', toName: 'Global Director', branchId: 'all', text: 'When is the next quarterly report?', time: '9:00 AM' },
    { id: 103, threadId: 'parent-okello', fromRole: 'parent', fromName: 'Ms. Okello', toRole: 'manager', toName: 'Manager', branchId: 'charis-kampala', text: 'Bella is feeling better, thanks!', time: '9:15 AM' },
    { id: 104, threadId: 'manager-director', fromRole: 'manager', fromName: 'Branch Manager (Kampala)', toRole: 'director', toName: 'Global Director', branchId: 'charis-kampala', text: 'Need approval for petty cash requested today.', time: '10:00 AM' }
  ];

  // ── Parent App Component ──────────────────────────────────────────────────
  const ShareLinkPanel = ({ role, childId, branchId }) => {
    let hash = '';
    if (role === 'director') hash = '#director';
    else if (role === 'investor') hash = '#investor';
    else if (role === 'manager') hash = `#manager/${branchId}`;
    else if (role === 'parent') hash = `#parent/${childId}`;
    
    let basePath = window.location.origin + window.location.pathname;
    if (!basePath.endsWith('.html')) {
        basePath += basePath.endsWith('/') ? 'amani.html' : '/amani.html';
    } else {
        basePath = basePath.replace(/[^/]+$/, 'amani.html');
    }
    const url = basePath + hash;
    
    return (
      <div style={{ background: 'var(--bg-deepest)', padding: 12, borderRadius: "var(--radius-sm)", border: '1px solid var(--border-default)', marginTop: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em', fontWeight: 600 }}>Your Personal App Link</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={url} style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', padding: '8px', borderRadius: 6, fontSize: 12 }} />
          <button onClick={() => { navigator.clipboard.writeText(url); alert('Link copied!'); }} style={{ background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', padding: '0 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Copy</button>
        </div>
        <button onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent('Here is your Amani OS link: ' + url))} style={{ width: '100%', marginTop: 8, background: '#25D366', color: '#fff', border: 'none', padding: '8px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 0C5.383 0 0 5.383 0 12.031c0 2.124.553 4.195 1.604 6.012L.211 23.789l5.882-1.543a11.96 11.96 0 005.938 1.57h.005c6.648 0 12.031-5.383 12.031-12.031S18.679 0 12.031 0zm0 21.848a9.98 9.98 0 01-5.093-1.385l-.365-.216-3.784.992.992-3.69-.237-.376a9.962 9.962 0 01-1.528-5.334c0-5.503-4.478-9.981-9.981-9.981 2.668 0 5.176 1.038 7.062 2.925a9.957 9.957 0 012.925 7.056c0 5.503-4.478 9.981-9.981 9.981zm5.474-7.48c-.3-.15-1.774-.876-2.048-.976-.274-.101-.474-.15-.674.15-.2.3-.775.976-.95 1.176-.175.2-.35.225-.65.075-.3-.15-1.266-.466-2.411-1.488-.89-.794-1.49-1.774-1.665-2.074-.175-.3-.02-.462.13-.612.135-.135.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.674-1.626-.924-2.226-.242-.582-.488-.5-.674-.51-.175-.01-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.026-1.05 2.502 0 1.476 1.075 2.902 1.225 3.102.15.2 2.115 3.227 5.124 4.526.717.31 1.275.495 1.711.635.718.23 1.371.197 1.884.12.574-.086 1.774-.726 2.024-1.426.25-.7.25-1.302.175-1.426-.075-.125-.275-.2-.575-.35z"/></svg>
          Share
        </button>
      </div>
    );
  };

  const ParentApp = ({ user, childrenData, scheduleData, onLogout, globalMessages, setGlobalMessages, setParentFeedback }) => {
    const child = childrenData.find(c => c.id === user.childId);
    const [activeTab, setActiveTab] = React.useState('home');
    const [msgText, setMsgText] = React.useState('');
    const [feedbackText, setFeedbackText] = React.useState('');
    const [feedbackRating, setFeedbackRating] = React.useState(5);
    const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(
      typeof Notification !== 'undefined' && Notification.permission === 'granted'
    );
    const [isInstallable, setIsInstallable] = React.useState(false);
    const [isEditingProfile, setIsEditingProfile] = React.useState(false);

    React.useEffect(() => {
      const handleInstallable = () => setIsInstallable(true);
      if (typeof window !== 'undefined') {
        window.addEventListener('pwa-installable', handleInstallable);
        if (window.triggerPWAInstall) setIsInstallable(true);
        return () => window.removeEventListener('pwa-installable', handleInstallable);
      }
    }, []);

    const handleEnableNotifications = () => {
      if (!('Notification' in window)) {
        alert('This browser does not support desktop notification');
        return;
      }
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          new Notification('Amani OS', {
            body: 'Notifications activated successfully!',
            icon: 'uploads/NEXT Favicon Transperent Logo@3x.png'
          });
        }
      });
    };

    const myMessages = globalMessages.filter(m => 
      (m.fromRole === 'parent' && m.fromName === user.name) || 
      (m.toRole === 'parent' && m.toName === user.name)
    );

    if (!child) return <div>Child not found</div>;

    // Agent Nia: Auto-Notifications
    const prevChildRef = React.useRef(child);
    const prevMsgsLengthRef = React.useRef(myMessages.length);
    React.useEffect(() => {
      if (!notificationsEnabled) return;

      const prevChild = prevChildRef.current;
      
      // Check for Milestone update
      if (child.milestone && child.milestone !== prevChild.milestone) {
        new Notification('🌟 New Milestone!', {
          body: `${child.name} just achieved: ${child.milestone}`,
        });
      }
      
      // Check for Nap status change
      if (child.nap !== prevChild.nap) {
        new Notification('💤 Schedule Update', {
          body: child.nap ? `${child.name} is now napping.` : `${child.name} woke up!`,
        });
      }

      // Check for New Messages
      if (myMessages.length > prevMsgsLengthRef.current) {
        const latestMsg = myMessages[myMessages.length - 1];
        if (latestMsg.fromRole !== 'parent') { // Only notify if it's from the center
          new Notification(`💬 New Message from ${latestMsg.fromName}`, {
            body: latestMsg.text,
          });
        }
      }

      prevChildRef.current = child;
      prevMsgsLengthRef.current = myMessages.length;
    }, [child, myMessages.length, notificationsEnabled]);

    const [windowWidth] = useWindowSize();
    const isMobile = windowWidth < 768;

    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: 'var(--bg-deepest)', fontFamily: 'var(--font-body)', overflow: 'hidden' }}>
        
        {/* ── SIDEBAR / HEADER ── */}
        <div style={{ 
          width: isMobile ? '100%' : '320px', 
          background: 'var(--bg-default)', 
          borderRight: isMobile ? 'none' : '1px solid var(--border-subtle)', 
          borderBottom: isMobile ? '1px solid var(--border-subtle)' : 'none',
          display: 'flex', flexDirection: 'column',
          zIndex: 10
        }}>
          {/* Profile Area */}
          <div style={{ padding: '30px 20px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(6,214,160,0.05) 0%, transparent 100%)' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={child.photoUrl} alt={child.name} style={{ width: isMobile ? 80 : 120, height: isMobile ? 80 : 120, borderRadius: '50%', border: '4px solid var(--bg-default)', boxShadow: '0 0 0 2px var(--mint)', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: child.present ? 'var(--mint)' : 'var(--danger)', border: '2px solid var(--bg-default)' }} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16, marginBottom: 4 }}>{child.name}</h2>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {child.present ? 'Checked In' : 'Absent'} {child.nap ? ' • Napping' : ''}
            </div>
            {isInstallable && (
              <button onClick={() => window.triggerPWAInstall && window.triggerPWAInstall()} style={{ marginTop: 12, padding: '8px 16px', background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                📱 Install App
              </button>
            )}
            <button onClick={() => setIsEditingProfile(true)} style={{ marginTop: 12, padding: '8px 16px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              ✏️ Edit Profile
            </button>
          </div>

          {/* Navigation */}
          <div style={{ flex: 1, padding: '20px 16px', display: isMobile ? 'none' : 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { id: 'home', icon: '☀️', label: 'The Day' },
              { id: 'gallery', icon: '📸', label: 'Gallery' },
              { id: 'learning', icon: '📚', label: 'Curriculum' },
              { id: 'journey', icon: '🌟', label: 'Journey' },
              { id: 'messages', icon: '💬', label: 'Messages' },
              { id: 'pickup', icon: '🪪', label: 'Pickup QR' },
              { id: 'feedback', icon: '📝', label: 'Feedback' },
            ].map(nav => (
              <button key={nav.id} onClick={() => setActiveTab(nav.id)} style={{
                display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '12px 16px',
                background: activeTab === nav.id ? 'rgba(6,214,160,0.1)' : 'transparent',
                border: 'none', borderRadius: "var(--radius-md)", cursor: 'pointer', transition: 'all 0.2s ease',
                color: activeTab === nav.id ? 'var(--mint)' : 'var(--text-secondary)',
                fontWeight: activeTab === nav.id ? 700 : 500, fontSize: 15, textAlign: 'left'
              }}>
                <span style={{ fontSize: 20 }}>{nav.icon}</span>
                {nav.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 20, display: isMobile ? 'none' : 'block' }}>
            <ShareLinkPanel role="parent" childId={child.id} />
            
            {!notificationsEnabled && (
              <button onClick={handleEnableNotifications} style={{ width: '100%', padding: '12px', background: 'rgba(0, 252, 143, 0.1)', border: '1px solid var(--mint)', borderRadius: "var(--radius-md)", color: 'var(--mint)', fontWeight: 600, cursor: 'pointer', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span>🔔</span> Enable Notifications
              </button>
            )}

            <button onClick={onLogout} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: "var(--radius-md)", color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', marginTop: 16 }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* ── MAIN CONTENT AREA ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px' : '40px', position: 'relative' }}>
          <div style={{ width: '100%', margin: '0 auto' }}>
            
            {activeTab === 'home' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                
                {/* 1. Interactive Child Hero Section */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(20,0,53,0.9) 0%, rgba(10,0,26,0.9) 100%)',
                  border: '1px solid rgba(6,214,160,0.2)',
                  borderRadius: "var(--radius-lg)",
                  padding: isMobile ? '24px' : '40px',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: 'center',
                  gap: 32,
                  marginBottom: 32,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Glassmorphism subtle glow */}
                  <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'var(--mint)', filter: 'blur(100px)', opacity: 0.1, borderRadius: '50%' }}></div>
                  
                  <div style={{ position: 'relative' }}>
                    <img src={child.photoUrl} alt={child.name} style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-default)', boxShadow: '0 0 0 3px var(--mint)' }} />
                    <div style={{ position: 'absolute', bottom: 5, right: 5, width: 24, height: 24, borderRadius: '50%', background: child.present ? 'var(--mint)' : 'var(--danger)', border: '3px solid var(--bg-default)' }} />
                  </div>
                  
                  <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: 12, marginBottom: 8 }}>
                      <h1 style={{ fontSize: 36, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>{child.name}</h1>
                      <span style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>ID: #ARM-{child.id}</span>
                    </div>
                    <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 20 }}>
                      Age {child.age} • Enrolled {new Date(child.enrollmentDate).toLocaleDateString()}
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                      <div style={{ background: 'var(--bg-elevated)', padding: '8px 16px', borderRadius: "var(--radius-md)", border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{child.mood}</span>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Mood</div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>Happy</div>
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-elevated)', padding: '8px 16px', borderRadius: "var(--radius-md)", border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{child.nap ? '💤' : '☀️'}</span>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{child.present ? (child.nap ? 'Napping' : 'Active & Playing') : 'At Home'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Dashboard Grid (Finance & Milestones) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 40 }}>
                  
                  {/* Finance Card */}
                  <div style={{ 
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 24,
                    position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: child.invoiceStatus === 'paid' ? 'var(--mint)' : child.invoiceStatus === 'due' ? 'var(--warning)' : 'var(--danger)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💳</div>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Account Status</h3>
                          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Billing & Finance</div>
                        </div>
                      </div>
                      <span style={{ 
                        background: child.invoiceStatus === 'paid' ? 'rgba(6,214,160,0.1)' : child.invoiceStatus === 'due' ? 'rgba(255,165,2,0.1)' : 'rgba(239,71,111,0.1)',
                        color: child.invoiceStatus === 'paid' ? 'var(--mint)' : child.invoiceStatus === 'due' ? 'var(--warning)' : 'var(--danger)',
                        border: `1px solid ${child.invoiceStatus === 'paid' ? 'rgba(6,214,160,0.2)' : child.invoiceStatus === 'due' ? 'rgba(255,165,2,0.2)' : 'rgba(239,71,111,0.2)'}`,
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase'
                      }}>
                        {child.invoiceStatus}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Last Payment</span>
                        <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>July 1st, 2026</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Next Invoice Due</span>
                        <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>August 1st, 2026</span>
                      </div>
                    </div>
                  </div>

                  {/* Milestone Card */}
                  <div style={{ 
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 20, padding: 24,
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,209,102,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏆</div>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Latest Milestone</h3>
                          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Development Tracking</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--gold)', marginBottom: 4 }}>
                        {child.milestone || 'Observing progress...'}
                      </div>
                      {child.milestoneTime && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Logged at {child.milestoneTime}</div>}
                      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                        Active Learning Score: <strong style={{ color: 'var(--text-primary)' }}>{child.activeScore}</strong> pts
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('journey')} style={{ marginTop: 20, width: '100%', padding: '10px', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: "var(--radius-sm)", color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                      View Full Journey Timeline
                    </button>
                  </div>

                </div>

                {/* 3. The Day Timeline */}
                <h3 style={{ fontSize: 20, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 20 }}>Today's Activity Log</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {(scheduleData && scheduleData.length > 0 ? scheduleData : []).map((item, i) => (
                    <div key={i} style={{ 
                      display: 'flex', gap: 16, padding: 20, borderRadius: "var(--radius-lg)", 
                      background: item.type === 'faith' ? 'linear-gradient(145deg, rgba(255, 214, 0, 0.1), rgba(255, 214, 0, 0.02))' : 'var(--bg-elevated)', 
                      border: item.type === 'faith' ? '1px solid rgba(255, 214, 0, 0.3)' : '1px solid var(--border-subtle)',
                      boxShadow: item.type === 'faith' ? '0 4px 20px rgba(255, 214, 0, 0.05)' : 'none'
                    }}>
                      <div style={{ 
                        width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
                        background: item.type === 'faith' ? 'rgba(255, 214, 0, 0.15)' : 'var(--bg-deep)'
                      }}>
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: item.type === 'faith' ? 'var(--gold)' : 'var(--text-primary)' }}>{item.activity || item.title}</span>
                          <span style={{ fontSize: 12, color: item.type === 'faith' ? 'rgba(255, 214, 0, 0.6)' : 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{item.time}</span>
                        </div>
                        <div style={{ fontSize: 14, color: item.type === 'faith' ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-secondary)' }}>{item.caretaker ? `Led by ${item.caretaker}` : item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h1 style={{ fontSize: 32, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Gallery</h1>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Live from Center</span>
                </div>
                {(!child.gallery || child.gallery.length === 0) ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: "var(--radius-lg)" }}>
                    No photos uploaded yet. Check back soon!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                    {child.gallery.map((src, i) => (
                      <div key={i} style={{ borderRadius: "var(--radius-lg)", overflow: 'hidden', aspectRatio: '1/1', position: 'relative', border: '1px solid var(--border-subtle)' }}>
                        <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'journey' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h1 style={{ fontSize: 32, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 24 }}>Milestones & Journey</h1>
                
                {/* Milestone Rings */}
                <h3 style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 600 }}>Developmental Domains</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {[
                    { label: 'Cognitive', pct: 85, color: 'var(--info)' },
                    { label: 'Physical', pct: 92, color: 'var(--mint)' },
                    { label: 'Social', pct: 78, color: 'var(--warning)' },
                    { label: 'Language', pct: 88, color: 'var(--danger)' },
                  ].map(m => {
                    const radius = 40;
                    const circumference = 2 * Math.PI * radius;
                    const offset = circumference - (m.pct / 100) * circumference;
                    return (
                      <div key={m.label} style={{ background: 'var(--bg-elevated)', padding: '24px 16px', borderRadius: "var(--radius-lg)", border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 12 }}>
                          <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--bg-deep)" strokeWidth="8" />
                            <circle cx="50" cy="50" r={radius} fill="none" stroke={m.color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
                          </svg>
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {m.pct}%
                          </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{m.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* WHO Growth Curve */}
                <h3 style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 600 }}>WHO Growth Tracker</h3>
                <div style={{ background: 'var(--bg-elevated)', padding: 24, borderRadius: "var(--radius-lg)", border: '1px solid var(--border-subtle)', marginBottom: 32, overflowX: 'auto' }}>
                  <div style={{ minWidth: 400 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Height (cm) over 12 months</div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 4, background: 'rgba(255,255,255,0.2)' }}></div><span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>WHO Median</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 4, background: 'var(--mint)' }}></div><span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{child.name}</span></div>
                      </div>
                    </div>
                    <svg width="100%" height="150" viewBox="0 0 400 150" preserveAspectRatio="none">
                      {/* Grid lines */}
                      <line x1="0" y1="25" x2="400" y2="25" stroke="var(--border-default)" strokeDasharray="4 4" />
                      <line x1="0" y1="75" x2="400" y2="75" stroke="var(--border-default)" strokeDasharray="4 4" />
                      <line x1="0" y1="125" x2="400" y2="125" stroke="var(--border-default)" strokeDasharray="4 4" />
                      
                      {/* WHO Median Band */}
                      <path d="M 0,90 Q 100,85 200,80 T 400,60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="12" strokeLinecap="round" />
                      
                      {/* Child Curve */}
                      <path d="M 0,100 Q 100,90 200,80 T 400,55" fill="none" stroke="var(--mint)" strokeWidth="4" strokeLinecap="round" />
                      
                      {/* Data Points */}
                      <circle cx="0" cy="100" r="5" fill="var(--mint)" />
                      <circle cx="200" cy="80" r="5" fill="var(--mint)" />
                      <circle cx="400" cy="55" r="5" fill="var(--bg-deep)" stroke="var(--mint)" strokeWidth="3" />
                      
                      {/* Labels */}
                      <text x="0" y="145" fill="var(--text-tertiary)" fontSize="12">Jan</text>
                      <text x="190" y="145" fill="var(--text-tertiary)" fontSize="12">Jun</text>
                      <text x="375" y="145" fill="var(--text-tertiary)" fontSize="12">Dec</text>
                    </svg>
                  </div>
                </div>

                {/* Achievement Timeline */}
                <h3 style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 600 }}>Achievement Timeline</h3>
                <div style={{ position: 'relative', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
                  <div style={{ position: 'absolute', left: 7, top: 12, bottom: 12, width: 2, background: 'var(--border-default)' }} />
                  {[
                    { date: 'Last Week', icon: '🎨', title: 'Recognized Colors', desc: 'Successfully sorted blocks by primary colors.' },
                    { date: '1 Month Ago', icon: '🗣️', title: 'First Full Sentence', desc: 'Communicated needs effectively in a complete sentence.' },
                    { date: '3 Months Ago', icon: '🤝', title: 'Social Play', desc: 'Shared toys with peers without prompting.' },
                    { date: '6 Months Ago', icon: '👣', title: 'First Steps', desc: 'Walked across the room unassisted.' },
                  ].map((ach, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: -24, top: 4, width: 16, height: 16, borderRadius: '50%', background: 'var(--mint)', border: '4px solid var(--bg-deepest)' }} />
                      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <span style={{ fontSize: 24 }}>{ach.icon}</span>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{ach.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{ach.date}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{ach.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'learning' && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h1 style={{ fontSize: 32, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 24 }}>Weekly Curriculum</h1>
                <div style={{ display: 'grid', gap: 20 }}>
                  <div style={{ background: 'var(--bg-elevated)', padding: 24, borderRadius: "var(--radius-lg)", border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--mint)', marginBottom: 8, letterSpacing: '0.05em', fontWeight: 700 }}>Theme of the Week</div>
                    <div style={{ fontSize: 24, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 12 }}>Community Helpers</div>
                    <div style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.5 }}>This week we are learning about doctors, firefighters, and teachers! We explore how they help our community stay safe and healthy.</div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
                    <div style={{ background: 'var(--bg-elevated)', padding: 24, borderRadius: "var(--radius-lg)", border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12, letterSpacing: '0.05em', fontWeight: 600 }}>Faith Focus</div>
                      <div style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>📖 <span style={{ fontWeight: 600 }}>Memory Verse:</span> "Love one another."</div>
                      <div style={{ fontSize: 16, color: 'var(--text-primary)' }}>🕊️ <span style={{ fontWeight: 600 }}>Bible Story:</span> The Good Samaritan</div>
                    </div>
                    
                    <div style={{ background: 'var(--bg-elevated)', padding: 24, borderRadius: "var(--radius-lg)", border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 12, letterSpacing: '0.05em', fontWeight: 600 }}>Core Activities</div>
                      <ul style={{ margin: 0, paddingLeft: 24, color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.6 }}>
                        <li>Role-playing in the "Hospital" corner</li>
                        <li>Writing "Thank You" cards to postmen</li>
                        <li>Sorting objects by community roles</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'messages' && (
              <div style={{ animation: 'fadeIn 0.3s ease', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <h1 style={{ fontSize: 32, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 24 }}>Messages</h1>
                <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: "var(--radius-lg)", border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
                    {myMessages.length === 0 && <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 40 }}>No messages yet. Say hello!</div>}
                    {myMessages.map(m => (
                      <div key={m.id} style={{ 
                        marginBottom: 16, padding: 16, borderRadius: "var(--radius-md)", maxWidth: '80%',
                        background: m.fromRole === 'parent' ? 'rgba(0, 252, 143, 0.1)' : 'var(--bg-deep)',
                        border: m.fromRole === 'parent' ? '1px solid rgba(0, 252, 143, 0.2)' : '1px solid var(--border-default)',
                        alignSelf: m.fromRole === 'parent' ? 'flex-end' : 'flex-start',
                        marginLeft: m.fromRole === 'parent' ? 'auto' : 0
                      }}>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>{m.fromName} • {m.time}</div>
                        <div style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.4 }}>{m.text}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-deep)', display: 'flex', gap: 12 }}>
                    <input value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Message the Branch Manager..." style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: "var(--radius-sm)", fontSize: 15, outline: 'none' }} />
                    <button onClick={async () => {
                      if (!msgText.trim()) return;
                      const newMsg = { id: Date.now(), threadId: `parent-${child.id}`, fromRole: 'parent', fromName: user.name, toRole: 'manager', toName: 'Branch Manager', branchId: 'charis-kampala', text: msgText, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
                      setGlobalMessages([...globalMessages, newMsg]);
                      setMsgText('');
                      if (window.supabase) {
                        await window.supabase.createClient('https://eztgwiujujaxswlslqbf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dGd3aXVqdWpheHN3bHNscWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzE5NjEsImV4cCI6MjA5ODc0Nzk2MX0.mzyC4DLlC-s3YznfQLTfNxa227_hQlLAt0VhL_dGxr0').from('global_messages').insert([{
                           threadid: newMsg.threadId,
                           fromrole: newMsg.fromRole,
                           fromname: newMsg.fromName,
                           torole: newMsg.toRole,
                           toname: newMsg.toName,
                           branchid: newMsg.branchId,
                           text: newMsg.text,
                           time: newMsg.time
                        }]);
                      }
                    }} style={{ background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', padding: '0 24px', borderRadius: "var(--radius-sm)", fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>Send</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pickup' && (
              <div style={{ animation: 'fadeIn 0.3s ease', textAlign: 'center', maxWidth: 400, margin: '40px auto' }}>
                <h1 style={{ fontSize: 32, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 12 }}>Pickup Pass</h1>
                <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 32 }}>Scan this code at the center gate to authorize pickup for {child.name}.</p>
                
                <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)', padding: 32, borderRadius: "var(--radius-lg)", display: 'inline-block', marginBottom: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '8px solid var(--bg-elevated)' }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent((typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '') + '?pass=' + child.id)}`} alt="QR Code" style={{ width: 240, height: 240, mixBlendMode: 'multiply' }} />
                </div>
                
                <div style={{ background: 'var(--bg-elevated)', padding: 20, borderRadius: "var(--radius-lg)", border: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8, letterSpacing: '0.05em', fontWeight: 600 }}>Authorized Pickups</div>
                  <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 500 }}>{child.authorizedPickups || 'Parents only'}</div>
                </div>
              </div>
            )}

            {activeTab === 'feedback' && (
              <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 600, margin: '0 auto' }}>
                <h1 style={{ fontSize: 32, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 24 }}>Weekly Feedback</h1>
                
                {feedbackSubmitted ? (
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-lg)", padding: 48, textAlign: 'center' }}>
                    <div style={{ fontSize: 64, marginBottom: 24 }}>✨</div>
                    <div style={{ fontSize: 24, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>Thank you!</div>
                    <div style={{ fontSize: 16, color: 'var(--text-secondary)' }}>Your input helps us continuously improve the Amani experience.</div>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-lg)", padding: 32 }}>
                    <div style={{ marginBottom: 32 }}>
                      <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>How was {child.name}'s experience this week?</div>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <button key={star} onClick={() => setFeedbackRating(star)} style={{ background: 'transparent', border: 'none', fontSize: 40, cursor: 'pointer', filter: star <= feedbackRating ? 'none' : 'grayscale(100%) opacity(0.2)', transition: 'all 0.2s', transform: star <= feedbackRating ? 'scale(1.1)' : 'scale(1)' }}>⭐</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>Additional Comments</div>
                      <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={5} placeholder="Tell us what you liked or how we can improve..." style={{ width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: 16, borderRadius: "var(--radius-md)", fontFamily: 'inherit', resize: 'none', fontSize: 15, outline: 'none' }} />
                    </div>
                    <button onClick={() => {
                      if (setParentFeedback) {
                        setParentFeedback(prev => [{ id: Date.now(), parent: user.name, rating: feedbackRating, comment: feedbackText, date: new Date().toISOString().split('T')[0] }, ...prev]);
                      }
                      setFeedbackSubmitted(true);
                    }} style={{ width: '100%', background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', padding: '16px', borderRadius: "var(--radius-md)", fontWeight: 700, cursor: 'pointer', fontSize: 16, transition: 'background 0.2s' }}>Submit Feedback</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        {isMobile && (
          <div style={{ display: 'flex', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', padding: '12px 8px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', overflowX: 'auto', zIndex: 20 }}>
            {[
              { id: 'home', icon: '☀️', label: 'Day' },
              { id: 'gallery', icon: '📸', label: 'Gallery' },
              { id: 'learning', icon: '📚', label: 'Learn' },
              { id: 'messages', icon: '💬', label: 'Chat' },
              { id: 'pickup', icon: '🪪', label: 'Pass' },
            ].map(nav => (
              <div key={nav.id} onClick={() => setActiveTab(nav.id)} style={{ flex: 1, minWidth: 64, textAlign: 'center', color: activeTab === nav.id ? 'var(--mint)' : 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{nav.icon}</div>
                <div style={{ fontSize: 11, fontWeight: activeTab === nav.id ? 700 : 500 }}>{nav.label}</div>
              </div>
            ))}
          </div>
        )}

        {isEditingProfile && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: "var(--radius-lg)", padding: 32, width: '100%', maxWidth: 500, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
              <button onClick={() => setIsEditingProfile(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 24, cursor: 'pointer' }}>×</button>
              <h2 style={{ fontSize: 24, margin: '0 0 20px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Complete Profile</h2>
              <form onSubmit={e => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const updates = {};
                if (fd.get('photoUrl')) updates.photoUrl = fd.get('photoUrl');
                if (fd.get('emergencyContact')) updates.emergencyContact = fd.get('emergencyContact');
                if (fd.get('homeAddress')) updates.homeAddress = fd.get('homeAddress');
                if (fd.get('doctorInfo')) updates.doctorInfo = fd.get('doctorInfo');
                if (fd.get('favouriteMeals')) updates.favouriteMeals = fd.get('favouriteMeals');
                
                if (setChildrenData) {
                  setChildrenData(prev => prev.map(c => c.id === child.id ? { ...c, ...updates } : c));
                }
                setIsEditingProfile(false);
              }}>
                <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
                  <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Child's Photo URL (Optional)</label><input name="photoUrl" defaultValue={(child.photoUrl && child.photoUrl.includes('unsplash')) ? '' : child.photoUrl} placeholder="https://..." style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                  <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Emergency Contact (Name & Phone)</label><input name="emergencyContact" defaultValue={child.emergencyContact || ''} required style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                  <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Home Address</label><input name="homeAddress" defaultValue={child.homeAddress || ''} style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                  <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Doctor's Name & Clinic</label><input name="doctorInfo" defaultValue={child.doctorInfo || ''} style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                  <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Favourite Meals</label><input name="favouriteMeals" defaultValue={child.favouriteMeals === 'To be determined' ? '' : child.favouriteMeals} style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                </div>
                <button type="submit" style={{ width: '100%', padding: 14, background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', borderRadius: "var(--radius-md)", fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Save Profile</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

// ── Custom Hooks ──────────────────────────────────────────────────────────
  const useWindowSize = () => {
    const [size, setSize] = React.useState([window.innerWidth, window.innerHeight]);
    React.useEffect(() => {
      const handleResize = () => setSize([window.innerWidth, window.innerHeight]);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    return size;
  };

// ── Messages Panel (proper component to avoid Rules of Hooks violation) ───
  const MessagesPanel = ({ currentUser, globalMessages, setGlobalMessages, childrenData, centersData }) => {
    const [selectedThreadId, setSelectedThreadId] = React.useState(null);
    const [composeText, setComposeText] = React.useState('');
    const [recipient, setRecipient] = React.useState('');

    const visibleMessages = globalMessages.filter(m => {
      if (currentUser.role === 'investor') return m.toRole === 'investor' || (m.fromRole === 'investor' && m.toRole === 'director');
      if (currentUser.role === 'manager') return m.branchId === currentUser.branchId && (m.toRole === 'manager' || m.fromRole === 'manager');
      if (currentUser.role === 'director') return true;
      return false;
    });

    const threads = {};
    visibleMessages.forEach(m => {
      if (!threads[m.threadId]) threads[m.threadId] = { id: m.threadId, messages: [], participants: new Set() };
      threads[m.threadId].messages.push(m);
      threads[m.threadId].participants.add(m.fromName);
      threads[m.threadId].participants.add(m.toName);
    });
    const threadList = Object.values(threads).sort((a, b) => b.messages[b.messages.length - 1].id - a.messages[a.messages.length - 1].id);
    const activeThread = selectedThreadId ? threads[selectedThreadId] : null;

    let allowedRecipients = [];
    if (currentUser.role === 'investor') {
      allowedRecipients = [{ role: 'director', name: 'Global Director', threadId: 'director-investor', branchId: 'all' }];
    } else if (currentUser.role === 'manager') {
      allowedRecipients = [
        { role: 'director', name: 'Global Director', threadId: 'manager-director', branchId: currentUser.branchId },
        ...childrenData.map(c => ({ role: 'parent', name: c.parent, threadId: `parent-${c.id}`, branchId: currentUser.branchId }))
      ];
    } else if (currentUser.role === 'director') {
      allowedRecipients = [
        { role: 'investor', name: 'Investor Group', threadId: 'director-investor', branchId: 'all' },
        ...centersData.map(c => ({ role: 'manager', name: `Branch Manager (${c.name})`, threadId: 'manager-director', branchId: c.id }))
      ];
    }

    const handleSendMessage = async () => {
      if (!composeText.trim() || !recipient) return;
      const rec = allowedRecipients.find(r => r.name === recipient);
      if (!rec) return;
      const newMsg = {
        id: Date.now(),
        threadId: rec.threadId,
        fromRole: currentUser.role,
        fromName: currentUser.name,
        toRole: rec.role,
        toName: rec.name,
        branchId: rec.branchId,
        text: composeText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setGlobalMessages(prev => [...prev, newMsg]);
      setComposeText('');
      setSelectedThreadId(rec.threadId);
      
      if (window.supabase) {
        try {
          await window.supabase.createClient('https://eztgwiujujaxswlslqbf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dGd3aXVqdWpheHN3bHNscWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzE5NjEsImV4cCI6MjA5ODc0Nzk2MX0.mzyC4DLlC-s3YznfQLTfNxa227_hQlLAt0VhL_dGxr0').from('global_messages').insert([{
             threadid: newMsg.threadId,
             fromrole: newMsg.fromRole,
             fromname: newMsg.fromName,
             torole: newMsg.toRole,
             toname: newMsg.toName,
             branchid: newMsg.branchId,
             text: newMsg.text,
             time: newMsg.time
          }]);
        } catch(e) { console.error(e); }
      }
    };

    return (
      <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', gap: 20, height: 'calc(100vh - 150px)' }}>
        {/* Thread List */}
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 10, borderRight: '1px solid var(--border-subtle)', paddingRight: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
            {currentUser.role === 'investor' ? 'Director Comms' : 'Inbox'}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {threadList.map(thread => {
              const lastMsg = thread.messages[thread.messages.length - 1];
              const isSelected = selectedThreadId === thread.id;
              return (
                <div key={thread.id} onClick={() => setSelectedThreadId(thread.id)} style={{
                  background: isSelected ? 'rgba(6,214,160,0.1)' : 'var(--bg-elevated)',
                  border: isSelected ? '1px solid var(--mint)' : '1px solid var(--border-subtle)',
                  borderRadius: "var(--radius-md)", padding: 14, marginBottom: 10, cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {Array.from(thread.participants).filter(p => p !== currentUser.name).join(', ') || Array.from(thread.participants)[0]}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{lastMsg.time}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastMsg.text}</div>
                </div>
              );
            })}
            {threadList.length === 0 && <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No messages in your inbox.</div>}
          </div>
        </div>

        {/* Thread Viewer + Composer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)', borderRadius: "var(--radius-md)", border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {activeThread ? Array.from(activeThread.participants).filter(p => p !== currentUser.name).join(', ') : 'New Message'}
            </div>
            {currentUser.role === 'director' && activeThread && activeThread.id.startsWith('parent-') && (
              <span style={{ fontSize: 11, background: 'rgba(255,209,102,0.1)', color: 'var(--gold)', padding: '4px 8px', borderRadius: 4, fontWeight: 700 }}>READ ONLY (Parent ↔ Manager)</span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!activeThread ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-tertiary)' }}>
                <div style={{ fontSize: 40 }}>💬</div>
                <div>Select a thread on the left, or compose a new message below.</div>
              </div>
            ) : (
              activeThread.messages.map(msg => {
                const isMe = msg.fromRole === currentUser.role;
                return (
                  <div key={msg.id} style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    background: isMe ? 'rgba(6,214,160,0.1)' : 'var(--bg-deepest)',
                    border: isMe ? '1px solid rgba(6,214,160,0.2)' : '1px solid var(--border-subtle)',
                    padding: '12px 16px', borderRadius: "var(--radius-md)", maxWidth: '80%'
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{msg.fromName} • {msg.time}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{msg.text}</div>
                  </div>
                );
              })
            )}
          </div>

          {(!activeThread || !(currentUser.role === 'director' && activeThread && activeThread.id.startsWith('parent-'))) && (
            <div style={{ padding: 20, borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-default)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <select value={recipient} onChange={e => setRecipient(e.target.value)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '12px', borderRadius: "var(--radius-sm)", minWidth: 200 }}>
                  <option value="">-- Select Recipient --</option>
                  {allowedRecipients.map(r => <option key={r.name} value={r.name}>{r.name} ({r.role})</option>)}
                </select>
                <input
                  value={composeText} onChange={e => setComposeText(e.target.value)}
                  placeholder="Type a message..."
                  style={{ flex: 1, background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: "var(--radius-sm)", outline: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                />
                <button onClick={handleSendMessage} disabled={!composeText.trim() || !recipient} style={{ background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', padding: '0 24px', borderRadius: "var(--radius-sm)", fontWeight: 700, cursor: (!composeText.trim() || !recipient) ? 'not-allowed' : 'pointer', height: 44, opacity: (!composeText.trim() || !recipient) ? 0.5 : 1 }}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

// ── Operations Wall Tablet ────────────────────────────────────────────────
  const OperationsWallTablet = ({ center, childrenData, onSignOut, onOpenScanner, globalMessages }) => {
    // Operations Logic
    const [kitchenConfirmed, setKitchenConfirmed] = React.useState(false);
    
    // Stats
    const presentChildren = childrenData.filter(c => c.present);
    const staffOnShift = center.kpi.caretakers || 2;
    const ratio = presentChildren.length / staffOnShift;
    const ratioStatus = ratio > 10 ? '🚨 HIGH' : '✅ OK';

    // Expected Pickups (mocked logic: anyone missing or present but due to leave)
    const nextHourPickups = presentChildren.slice(0, 2); // mock

    return (
      <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          
          {/* Live Ratios / In Building */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, fontWeight: 700 }}>In Building Now</div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
              <div style={{ flex: 1, background: 'var(--bg-deepest)', padding: 16, borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--mint)' }}>{presentChildren.length}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Children</div>
              </div>
              <div style={{ flex: 1, background: 'var(--bg-deepest)', padding: 16, borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--info)' }}>{staffOnShift}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Staff</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: ratio > 10 ? 'rgba(255, 71, 87, 0.1)' : 'rgba(0, 252, 143, 0.1)', padding: 12, borderRadius: "var(--radius-sm)", border: `1px solid ${ratio > 10 ? 'rgba(255, 71, 87, 0.3)' : 'rgba(0, 252, 143, 0.3)'}` }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Live Ratio: {ratio.toFixed(1)}:1</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: ratio > 10 ? 'var(--danger)' : 'var(--mint)' }}>{ratioStatus}</span>
            </div>
          </div>

          {/* Kitchen & Allergy Check */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, fontWeight: 700 }}>Kitchen & Meals</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Today's Menu: <strong style={{ color: 'var(--text-primary)' }}>Mac & Cheese, Apples</strong></div>
            <div style={{ background: 'var(--bg-deepest)', padding: 16, borderRadius: "var(--radius-sm)", border: '1px solid var(--border-default)', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700, marginBottom: 8 }}>⚠️ Allergy Alerts for Present Children</div>
              {presentChildren.filter(c => c.allergies && c.allergies !== 'None').map(c => (
                <div key={c.id} style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 4 }}>
                  • {c.name}: <span style={{ color: 'var(--danger)' }}>{c.allergies}</span>
                </div>
              ))}
              {presentChildren.filter(c => c.allergies && c.allergies !== 'None').length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No allergies reported for present children.</div>
              )}
            </div>
            <button 
              onClick={() => setKitchenConfirmed(true)}
              disabled={kitchenConfirmed}
              style={{ width: '100%', padding: 12, borderRadius: "var(--radius-sm)", border: 'none', background: kitchenConfirmed ? 'rgba(0, 252, 143, 0.2)' : 'var(--mint)', color: kitchenConfirmed ? 'var(--mint)' : 'var(--text-inverse)', fontWeight: 700, cursor: kitchenConfirmed ? 'default' : 'pointer', transition: 'all 0.2s' }}
            >
              {kitchenConfirmed ? '✓ Allergy Cross-check Confirmed' : 'Confirm Allergy Cross-check to Serve'}
            </button>
          </div>
          
          {/* Cleaning Checklist */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, fontWeight: 700 }}>Cleaning Tasks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { task: 'Morning Sanitization (Toys)', done: true, time: '08:15 AM', by: 'Ms. Maria L.' },
                { task: 'Lunch Area Cleanup', done: false, time: null, by: null },
                { task: 'Nap Mats Disinfected', done: false, time: null, by: null },
                { task: 'End of Day Deep Clean', done: false, time: null, by: null },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-deepest)', padding: '10px 14px', borderRadius: "var(--radius-sm)", border: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: item.done ? 'var(--mint)' : 'transparent', border: `2px solid ${item.done ? 'var(--mint)' : 'var(--border-subtle)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.done && <span style={{ color: 'var(--text-inverse)', fontSize: 10 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: item.done ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.task}</span>
                  </div>
                  {item.done && <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textAlign: 'right' }}>{item.time}<br/>{item.by}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Pickup Window */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, fontWeight: 700 }}>Pickup Window (Next Hour)</div>
            {nextHourPickups.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-deepest)', padding: 12, borderRadius: "var(--radius-sm)", marginBottom: 8, border: '1px solid var(--border-default)' }}>
                <img src={c.photoUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Expected: {c.parent}</div>
                </div>
                <button onClick={() => onSignOut && onSignOut(c)} style={{ background: 'transparent', border: '1px solid var(--mint)', color: 'var(--mint)', borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer' }}>Sign Out</button>
              </div>
            ))}
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(255, 180, 0, 0.1)', borderRadius: "var(--radius-sm)", border: '1px solid rgba(255, 180, 0, 0.3)' }}>
              <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginBottom: 4 }}>Note: Non-routine Pickups</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Aiden Nakamya's aunt (Sarah) is authorized for today. Verify ID.</div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button onClick={onOpenScanner} style={{ width: '100%', padding: 12, borderRadius: "var(--radius-sm)", border: 'none', background: 'var(--text-primary)', color: 'var(--bg-default)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span>📷</span> Scan Pickup QR Code</button>
            </div>
          </div>

        </div>
      </div>
    );
  };

// ── Staff System & Rota (Module 02) ──────────────────────────────────────
  const StaffRotaSystem = ({ staffData, setStaffData, onCallPool }) => {
    // Expected kids per hour based on historic data
    const expectedChildrenPerHour = [
      { time: '07:00', count: 5 }, { time: '08:00', count: 18 }, { time: '09:00', count: 24 },
      { time: '10:00', count: 25 }, { time: '11:00', count: 25 }, { time: '12:00', count: 25 },
      { time: '13:00', count: 25 }, { time: '14:00', count: 25 }, { time: '15:00', count: 20 },
      { time: '16:00', count: 15 }, { time: '17:00', count: 8 }, { time: '18:00', count: 2 }
    ];

    const getStaffCountForHour = (hourStr) => {
      // Naive logic to parse hours and count active staff
      let count = 0;
      const hourNum = parseInt(hourStr.split(':')[0]);
      staffData.filter(s => s.status === 'active').forEach(s => {
        const [start, end] = s.hours.split(' - ').map(h => parseInt(h.split(':')[0]));
        if (hourNum >= start && hourNum < end) count++;
      });
      return count;
    };

    const handleSickCall = (staffId) => {
      const staffMember = staffData.find(s => s.id === staffId);
      if(confirm(`Log ${staffMember.name} as sick/absent today? This will trigger a ratio alert.`)) {
        setStaffData(staffData.map(s => s.id === staffId ? { ...s, status: 'sick' } : s));
      }
    };

    const handleCallCover = (staffId) => {
      const staffMember = staffData.find(s => s.id === staffId);
      const cover = onCallPool[0];
      if(confirm(`Call ${cover.name} to cover for ${staffMember.name}?`)) {
        const updatedStaff = staffData.filter(s => s.id !== staffId);
        updatedStaff.push({
          id: 's_cover_'+Date.now(), name: `${cover.name} (Cover)`, role: 'Substitute', shift: staffMember.shift, hours: staffMember.hours, status: 'active', room: staffMember.room
        });
        setStaffData(updatedStaff);
        alert(`${cover.name} has accepted the shift and is marked active!`);
      }
    };

    return (
      <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>Staff Rota & Ratio Management</h2>
        
        {/* Ratio Heatmap */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, fontWeight: 700 }}>Live Ratio Heatmap (Today)</div>
          <div style={{ display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 8 }}>
            {expectedChildrenPerHour.map(slot => {
              const staffCount = getStaffCountForHour(slot.time);
              const ratio = staffCount > 0 ? (slot.count / staffCount) : slot.count;
              const isDanger = ratio > 10 || staffCount === 0;
              return (
                <div key={slot.time} style={{ flex: '0 0 auto', width: 60, textAlign: 'center', background: 'var(--bg-deepest)', border: `1px solid ${isDanger ? 'rgba(255, 71, 87, 0.5)' : 'var(--border-default)'}`, borderRadius: "var(--radius-sm)", padding: '8px 4px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>{slot.time}</div>
                  <div style={{ width: '100%', height: 40, background: isDanger ? 'rgba(255, 71, 87, 0.2)' : 'rgba(0, 252, 143, 0.1)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDanger ? 'var(--danger)' : 'var(--mint)', fontWeight: 700, fontSize: 14 }}>
                    {ratio.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 8 }}>{slot.count} kids<br/>{staffCount} staff</div>
                </div>
              );
            })}
          </div>
          {expectedChildrenPerHour.some(slot => (getStaffCountForHour(slot.time) > 0 ? (slot.count / getStaffCountForHour(slot.time)) : slot.count) > 10) && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(255, 71, 87, 0.1)', borderRadius: "var(--radius-sm)", border: '1px solid rgba(255, 71, 87, 0.3)', color: 'var(--danger)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🚨</span> Ratio non-compliance detected! Coverage required immediately.
            </div>
          )}
        </div>

        {/* Daily Schedule & Sick Calls */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Today's Rota</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {staffData.map(staff => (
              <div key={staff.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-deepest)', padding: 12, borderRadius: "var(--radius-sm)", border: staff.status === 'sick' ? '1px solid rgba(255, 71, 87, 0.5)' : '1px solid var(--border-default)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: staff.status === 'sick' ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: staff.status === 'sick' ? 'line-through' : 'none' }}>{staff.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{staff.role} • {staff.room}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--mint)', fontWeight: 600, opacity: staff.status === 'sick' ? 0.3 : 1 }}>{staff.hours}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>({staff.shift})</div>
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                  {staff.status === 'active' ? (
                    <button onClick={() => handleSickCall(staff.id)} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}>Log Sick Call</button>
                  ) : (
                    <button onClick={() => handleCallCover(staff.id)} style={{ background: 'var(--danger)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', animation: 'pulse 2s infinite' }}>Call Cover</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Break Coverage Map */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, fontWeight: 700 }}>Break Coverage Schedule</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', fontSize: 12, color: 'var(--text-secondary)', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <div>Time</div>
              <div>Staff on Break</div>
              <div>Covered By</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', fontSize: 13, color: 'var(--text-primary)', padding: '8px 0', alignItems: 'center' }}>
              <div style={{ color: 'var(--mint)' }}>11:30 - 12:00</div>
              <div>Ms. Maria L. (Infant)</div>
              <div>Ms. Joy (Float)</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', fontSize: 13, color: 'var(--text-primary)', padding: '8px 0', alignItems: 'center', borderTop: '1px solid var(--border-deepest)' }}>
              <div style={{ color: 'var(--mint)' }}>12:00 - 12:30</div>
              <div>Ms. Sarah (Toddler)</div>
              <div>Ms. Joy (Float)</div>
            </div>
          </div>
        </div>

      </div>
    );
  };

// ── Amani Finance Module (Module 06) ────────────────────────────────────────
  const FinanceTab = ({ 
    currentUser, centersData, selectedCenterId, childrenData, 
    ledgerEntries, setLedgerEntries,
    expenseRequests, setExpenseRequests,
    payrollRuns, setPayrollRuns,
    recurringBills, setRecurringBills,
    pettyCashTransactions, setPettyCashTransactions,
    kpi, wallets, setWallets, invoices, setInvoices
  }) => {
    const isGlobal = currentUser.role === 'director' && selectedCenterId === 'all';
    const [financeView, setFinanceView] = React.useState('overview'); // 'overview', 'wallets', 'recurring', 'invoices', 'ledger'

    // Ledger form states
    const [showTxForm, setShowTxForm] = React.useState(false);
    const [txType, setTxType] = React.useState('income');
    const [txAccount, setTxAccount] = React.useState('4100');
    const [txAmount, setTxAmount] = React.useState('');
    const [txMemo, setTxMemo] = React.useState('');
    const [txDate, setTxDate] = React.useState(new Date().toISOString().split('T')[0]);

    // Printable Invoice state
    const [printInvoice, setPrintInvoice] = React.useState(null);

    const calcBalance = (accountCode, centerFilter = null) => {
        return ledgerEntries.reduce((acc, entry) => {
            if (centerFilter && entry.centerId !== centerFilter && centerFilter !== 'all') return acc;
            return acc + entry.lines.reduce((lacc, line) => {
                if (line.account === accountCode) {
                    const type = CHART_OF_ACCOUNTS[accountCode].type;
                    if (['Asset', 'Cost of care', 'Staff', 'Premises', 'Admin'].includes(type)) {
                        return lacc + (line.debit - line.credit);
                    } else {
                        return lacc + (line.credit - line.debit);
                    }
                }
                return lacc;
            }, 0);
        }, 0);
    };

    const totalCash = calcBalance('1100') + calcBalance('1110');
    const totalRevenue = calcBalance('4100') + calcBalance('4110') + calcBalance('4190');
    const totalExpenses = calcBalance('5100') + calcBalance('5120') + calcBalance('6100') + calcBalance('6110') + calcBalance('6600') + calcBalance('6610') + calcBalance('7100');
    const netIncome = totalRevenue - totalExpenses;

    const handleAddTx = (e) => {
        e.preventDefault();
        if (!txAmount || isNaN(txAmount)) return;
        const amount = parseInt(txAmount);
        
        let lines = [];
        if (txType === 'income') {
            lines = [
                { account: '1100', debit: amount, credit: 0 },
                { account: txAccount, debit: 0, credit: amount }
            ];
            
            // Auto-Allocation into Wallets Logic
            const updatedWallets = wallets.map(w => ({
                ...w,
                balance: w.balance + (amount * (w.allocationPct / 100))
            }));
            setWallets(updatedWallets);
            alert(`Auto-Allocation: UGX ${amount.toLocaleString()} was automatically split into your wallets based on your target percentages!`);
        } else {
            lines = [
                { account: txAccount, debit: amount, credit: 0 },
                { account: '1100', debit: 0, credit: amount }
            ];
        }

        const newEntry = {
            id: 'le-' + Date.now(),
            date: txDate,
            memo: txMemo || (txType === 'income' ? 'Income entry' : 'Expense entry'),
            centerId: selectedCenterId === 'all' ? centersData[0].id : selectedCenterId,
            lines: lines,
            fundedByCapital: false
        };

        setLedgerEntries([newEntry, ...ledgerEntries]);
        setShowTxForm(false);
        setTxAmount('');
        setTxMemo('');
    };

    const handleDeleteTx = (id) => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            setLedgerEntries(ledgerEntries.filter(e => e.id !== id));
        }
    };

    // Sub-navigation buttons
    const navItems = [
      { id: 'overview', label: 'Overview' },
      { id: 'wallets', label: 'Wallets & Allocation' },
      { id: 'recurring', label: 'Recurring Expenses' },
      { id: 'invoices', label: 'Invoices' },
      { id: 'ledger', label: 'Ledger' }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.3s ease' }}>
        
        {/* Sub-Navigation Header */}
        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16, overflowX: 'auto' }}>
          {navItems.map(item => (
             <button key={item.id} onClick={() => setFinanceView(item.id)} style={{ 
               background: 'transparent', border: 'none', fontSize: 15, fontWeight: 700, 
               color: financeView === item.id ? 'var(--mint)' : 'var(--text-secondary)', 
               cursor: 'pointer', padding: '0 0 4px 0', borderBottom: financeView === item.id ? '2px solid var(--mint)' : '2px solid transparent',
               whiteSpace: 'nowrap'
             }}>
               {item.label}
             </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {financeView === 'overview' && (
            <React.Fragment>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Total Cash (Bank + MoMo)</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--mint)' }}>UGX {totalCash.toLocaleString()}</div>
                    </div>
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Total Revenue</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--info)' }}>UGX {totalRevenue.toLocaleString()}</div>
                    </div>
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Net Income</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: netIncome >= 0 ? 'var(--mint)' : 'var(--danger)' }}>UGX {netIncome.toLocaleString()}</div>
                    </div>
                </div>

                {isGlobal && (
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 24 }}>
                        <h3 style={{ fontSize: 16, margin: '0 0 20px', color: 'var(--text-primary)' }}>Centers Side-by-Side Comparison</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                            {centersData.map(center => {
                                const cRev = calcBalance('4100', center.id) + calcBalance('4110', center.id);
                                const cExp = calcBalance('5100', center.id) + calcBalance('6100', center.id) + calcBalance('6600', center.id);
                                const cNet = cRev - cExp;
                                return (
                                    <div key={center.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-sm)", padding: 16 }}>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{center.name}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Revenue</span>
                                            <span style={{ color: 'var(--mint)' }}>UGX {cRev.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Expenses</span>
                                            <span style={{ color: 'var(--danger)' }}>UGX {cExp.toLocaleString()}</span>
                                        </div>
                                        <div style={{ borderTop: '1px dashed var(--border-subtle)', margin: '12px 0' }}></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                                            <span style={{ color: 'var(--text-primary)' }}>Net Margin</span>
                                            <span style={{ color: cNet >= 0 ? 'var(--mint)' : 'var(--danger)' }}>UGX {cNet.toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </React.Fragment>
        )}

        {/* ── WALLETS TAB ── */}
        {financeView === 'wallets' && (
            <React.Fragment>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', background: 'rgba(6,214,160,0.1)', padding: 16, borderRadius: "var(--radius-md)", borderLeft: '4px solid var(--mint)' }}>
                    <strong>Automated Allocation Active:</strong> When new income is added via the Ledger, the system automatically splits the funds into your defined wallets based on the target percentages.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                    {wallets.map((wallet, idx) => (
                        <div key={wallet.id} style={{ background: 'var(--bg-elevated)', border: `1px solid ${wallet.color}`, borderRadius: "var(--radius-md)", padding: 24, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: wallet.color, opacity: 0.1, borderRadius: '50%', filter: 'blur(15px)' }}></div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Wallet</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>{wallet.name}</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: wallet.color }}>UGX {wallet.balance.toLocaleString()}</div>
                            
                            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Target Allocation:</label>
                                <input type="number" value={wallet.allocationPct} onChange={e => {
                                    const newWallets = [...wallets];
                                    newWallets[idx].allocationPct = parseInt(e.target.value) || 0;
                                    setWallets(newWallets);
                                }} style={{ width: 60, padding: '4px 8px', background: 'var(--bg-default)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 4 }} />
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </React.Fragment>
        )}

        {/* ── RECURRING EXPENSES TAB ── */}
        {financeView === 'recurring' && (
            <React.Fragment>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Recurring Bills</h3>
                  <button style={{ background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', padding: '8px 16px', borderRadius: "var(--radius-sm)", fontWeight: 700, cursor: 'pointer' }}>+ Add Bill</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                    {recurringBills.map(bill => (
                        <div key={bill.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{bill.vendor}</span>
                                <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12, textTransform: 'capitalize' }}>{bill.frequency}</span>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger)', marginBottom: 16 }}>UGX {bill.amount.toLocaleString()}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                <span style={{ color: 'var(--text-tertiary)' }}>Next Due: {bill.nextDue}</span>
                                <button onClick={() => alert('Expense recorded and marked as Paid!')} style={{ background: 'transparent', border: '1px solid var(--mint)', color: 'var(--mint)', padding: '4px 12px', borderRadius: 4, cursor: 'pointer' }}>Mark Paid</button>
                            </div>
                        </div>
                    ))}
                </div>
            </React.Fragment>
        )}

        {/* ── INVOICES TAB ── */}
        {financeView === 'invoices' && (
            <React.Fragment>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Parent Invoices & Receipts</h3>
                  <button style={{ background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', padding: '8px 16px', borderRadius: "var(--radius-sm)", fontWeight: 700, cursor: 'pointer' }}>Generate Invoice</button>
                </div>
                
                {/* PDF Print View Modal */}
                {printInvoice && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ background: '#fff', width: 600, padding: 40, borderRadius: 8, color: '#000', position: 'relative' }}>
                            <button onClick={() => setPrintInvoice(null)} style={{ position: 'absolute', top: 16, right: 16, background: '#eee', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>Close</button>
                            <h2 style={{ margin: '0 0 8px', color: '#333' }}>INVOICE</h2>
                            <p style={{ margin: '0 0 24px', color: '#666' }}>Amani Childcare NEXT OS</p>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
                                <div>
                                    <strong>Bill To:</strong><br/>
                                    {printInvoice.parent}<br/>
                                    Child: {printInvoice.child}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong>Invoice #:</strong> {printInvoice.id}<br/>
                                    <strong>Date:</strong> {printInvoice.date}<br/>
                                    <strong>Due:</strong> {printInvoice.dueDate}
                                </div>
                            </div>
                            
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #ccc' }}>
                                        <th style={{ textAlign: 'left', padding: '8px 0' }}>Description</th>
                                        <th style={{ textAlign: 'right', padding: '8px 0' }}>Amount (UGX)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '16px 0', borderBottom: '1px solid #eee' }}>Tuition & Care Fees</td>
                                        <td style={{ textAlign: 'right', padding: '16px 0', borderBottom: '1px solid #eee' }}>{printInvoice.amount.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                            
                            <div style={{ textAlign: 'right', fontSize: 20, fontWeight: 700 }}>
                                Total Due: UGX {printInvoice.amount.toLocaleString()}
                            </div>
                            
                            <button onClick={() => alert('Printing...')} style={{ marginTop: 40, background: '#000', color: '#fff', border: 'none', padding: '10px 20px', cursor: 'pointer', width: '100%' }}>Print PDF</button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                    {invoices.map(inv => (
                        <div key={inv.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>#{inv.id}</span>
                                <span style={{ 
                                    fontSize: 12, padding: '2px 8px', borderRadius: 12, textTransform: 'capitalize', fontWeight: 600,
                                    background: inv.status === 'paid' ? 'rgba(6,214,160,0.1)' : inv.status === 'overdue' ? 'rgba(255,71,87,0.1)' : 'rgba(255,209,102,0.1)',
                                    color: inv.status === 'paid' ? 'var(--mint)' : inv.status === 'overdue' ? 'var(--danger)' : 'var(--gold)'
                                }}>{inv.status}</span>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{inv.parent}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Child: {inv.child}</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--info)', marginBottom: 16 }}>UGX {inv.amount.toLocaleString()}</div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Due: {inv.dueDate}</span>
                                <button onClick={() => setPrintInvoice(inv)} style={{ background: 'var(--bg-default)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>View PDF</button>
                            </div>
                        </div>
                    ))}
                </div>
            </React.Fragment>
        )}

        {/* ── LEDGER TAB ── */}
        {financeView === 'ledger' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>General Ledger</h3>
                  <button onClick={() => setShowTxForm(!showTxForm)} style={{ background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', padding: '8px 16px', borderRadius: "var(--radius-sm)", fontWeight: 700, cursor: 'pointer' }}>
                      {showTxForm ? 'Cancel' : '+ Add Transaction'}
                  </button>
                </div>

                {showTxForm && (
                    <form onSubmit={handleAddTx} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--mint)', borderRadius: "var(--radius-md)", padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ fontSize: 14, color: 'var(--mint)', background: 'rgba(6,214,160,0.1)', padding: 12, borderRadius: 6 }}>
                            💡 Note: Adding Income will automatically trigger the Auto-Allocation rules to fill your wallets.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Type</label>
                                <select value={txType} onChange={e => {
                                    setTxType(e.target.value);
                                    setTxAccount(e.target.value === 'income' ? '4100' : '5100');
                                }} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-deepest)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: "var(--radius-sm)" }}>
                                    <option value="income">Income</option>
                                    <option value="expense">Expenditure</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Category</label>
                                <select value={txAccount} onChange={e => setTxAccount(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-deepest)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: "var(--radius-sm)" }}>
                                    {Object.values(CHART_OF_ACCOUNTS).filter(a => txType === 'income' ? a.type === 'Income' : ['Cost of care', 'Staff', 'Premises', 'Admin'].includes(a.type)).map(a => (
                                        <option key={a.code} value={a.code}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Amount (UGX)</label>
                                <input type="number" required value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-deepest)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: "var(--radius-sm)" }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Date</label>
                                <input type="date" required value={txDate} onChange={e => setTxDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-deepest)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: "var(--radius-sm)" }} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Memo</label>
                                <input type="text" required value={txMemo} onChange={e => setTxMemo(e.target.value)} placeholder="E.g. Parent fee payment..." style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-deepest)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: "var(--radius-sm)" }} />
                            </div>
                        </div>
                        <button type="submit" style={{ background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', padding: '12px 24px', borderRadius: "var(--radius-sm)", fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}>
                            Save Transaction
                        </button>
                    </form>
                )}

                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <tr>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-tertiary)' }}>Date</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-tertiary)' }}>Memo</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-tertiary)' }}>Account</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-tertiary)' }}>Debit</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-tertiary)' }}>Credit</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-tertiary)' }}></th>
                        </tr>
                        </thead>
                        <tbody>
                        {ledgerEntries.map((entry, entryIndex) => (
                            <React.Fragment key={entry.id}>
                                {entry.lines.map((line, idx) => (
                                    <tr key={`${entry.id}-${idx}`} style={{ borderBottom: idx === entry.lines.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{idx === 0 ? entry.date : ''}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{idx === 0 ? entry.memo : ''}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{CHART_OF_ACCOUNTS[line.account] ? CHART_OF_ACCOUNTS[line.account].name : line.account}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: line.debit > 0 ? 'var(--mint)' : 'transparent' }}>{line.debit > 0 ? line.debit.toLocaleString() : '-'}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: line.credit > 0 ? 'var(--danger)' : 'transparent' }}>{line.credit > 0 ? line.credit.toLocaleString() : '-'}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            {idx === 0 && (
                                                <button onClick={() => handleDeleteTx(entry.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>×</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>
    );
  };


// ── Inventory System ─────────────────────────────────────────────────────
  const InventorySystem = ({ currentUser, inventoryItems, setInventoryItems }) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Global Inventory</h2>
          {currentUser.role === 'director' && (
            <button style={{ background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', padding: '8px 16px', borderRadius: "var(--radius-sm)", fontWeight: 700, cursor: 'pointer' }}>
              + Add Purchase
            </button>
          )}
        </div>

        {/* Low Stock Alerts */}
        {inventoryItems.some(item => item.qty <= item.minQty) && (
          <div style={{ background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.3)', borderRadius: "var(--radius-sm)", padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🚨</span> Low Stock Alerts
            </div>
            {inventoryItems.filter(item => item.qty <= item.minQty).map(item => (
              <div key={item.id} style={{ color: 'var(--text-primary)', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                <span>{item.item} ({item.category})</span>
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Qty: {item.qty} (Min: {item.minQty})</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Item', 'Category', 'Supplier', 'Qty', 'Min Qty', 'Cost (UGX)', 'Last Purchased'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventoryItems.map(item => {
                const isLow = item.qty <= item.minQty;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: isLow ? 'rgba(255, 71, 87, 0.05)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.item}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{item.category}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{item.supplier}</td>
                    <td style={{ padding: '12px 16px', color: isLow ? 'var(--danger)' : 'var(--text-primary)', fontWeight: isLow ? 700 : 400 }}>{item.qty}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }}>{item.minQty}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{item.cost.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{item.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

// ── Expansion Dashboard Component ──────────────────────────────────────────
  const ExpansionDashboard = ({ expansionProjects }) => {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '0 0 24px 0', color: 'var(--text-primary)' }}>Expansion Playbook</h2>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.6, background: 'var(--bg-deep)', padding: 16, borderRadius: "var(--radius-md)", borderLeft: '4px solid var(--mint)' }}>
          <strong>Launch Tracker:</strong> Monitoring new center setups according to the franchise playbook rules. A center must complete all 4 Pre-Launch phases before opening.
        </div>

        {expansionProjects.map(proj => (
          <div key={proj.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 20, color: 'var(--text-primary)' }}>{proj.name}</h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Launch Target: {proj.launchDate}</div>
              </div>
              <div style={{ padding: '6px 12px', borderRadius: "var(--radius-sm)", background: 'rgba(6,214,160,0.1)', color: 'var(--mint)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                {proj.status}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {proj.phases.map((phase, i) => {
                const isCompleted = phase.status === 'completed';
                const isInProgress = phase.status === 'in-progress';
                const color = isCompleted ? '#10B981' : isInProgress ? 'var(--gold)' : 'var(--text-tertiary)';
                return (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: isCompleted ? 'rgba(16,185,129,0.1)' : isInProgress ? 'rgba(255,209,102,0.1)' : 'var(--bg-deep)', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, fontSize: 12, flexShrink: 0 }}>
                      {isCompleted ? '✓' : (i + 1)}
                    </div>
                    <div style={{ flex: 1, background: 'var(--bg-deep)', padding: 16, borderRadius: 10, border: isInProgress ? '1px solid rgba(255,209,102,0.3)' : '1px solid transparent' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{phase.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{phase.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

// ── Initialize Supabase ────────────────────────────────────────────────────
  const supabaseUrl = 'https://eztgwiujujaxswlslqbf.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dGd3aXVqdWpheHN3bHNscWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzE5NjEsImV4cCI6MjA5ODc0Nzk2MX0.mzyC4DLlC-s3YznfQLTfNxa227_hQlLAt0VhL_dGxr0';
  const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

// ── AuthScreen Component ──────────────────────────────────────────────────
  const AuthScreen = ({ supabase, onLogin }) => {
    const [mode, setMode] = React.useState('login'); // 'login' | 'signup' | 'otp'
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [otpCode, setOtpCode] = React.useState('');
    const [role, setRole] = React.useState('director');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    const handleAuth = async (e) => {
      e.preventDefault();
      if (!supabase) return setError("System disconnected");
      setLoading(true); setError(null);
      try {
        if (mode === 'signup') {
          const { data, error: signUpErr } = await supabase.auth.signUp({
            email, password, options: { data: { role } }
          });
          if (signUpErr) throw signUpErr;
          setMode('otp'); // proceed to enter OTP
        } else if (mode === 'login') {
          const { data, error: signInErr } = await supabase.auth.signInWithPassword({
            email, password
          });
          if (signInErr) {
            if (signInErr.message.includes('Email not confirmed')) setMode('otp');
            else throw signInErr;
          } else if (data.session) {
            onLogin(data.user);
          } else {
            setMode('otp');
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const handleVerifyOtp = async (e) => {
      e.preventDefault();
      if (!supabase) return;
      setLoading(true); setError(null);
      try {
        const { data, error: otpErr } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' });
        if (otpErr) throw otpErr;
        if (data.session) onLogin(data.user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deepest)', fontFamily: 'var(--font-body)', padding: 20 }}>
        <div style={{ background: 'var(--bg-default)', padding: 40, borderRadius: "var(--radius-lg)", border: '1px solid var(--border-subtle)', width: '100%', maxWidth: 420, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--mint)', margin: '0 0 8px 0' }}>Next OS</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Childcare Management System</p>
          </div>

          {error && <div style={{ background: 'rgba(255, 71, 87, 0.1)', color: 'var(--danger)', padding: 12, borderRadius: "var(--radius-sm)", fontSize: 13, marginBottom: 24, border: '1px solid rgba(255, 71, 87, 0.3)' }}>{error}</div>}

          {mode === 'otp' ? (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 8 }}>Enter the 6-digit one-time code sent to <strong>{email}</strong></div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>One-Time Code</label>
                <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="000000" required style={{ width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: "var(--radius-sm)", fontSize: 18, textAlign: 'center', letterSpacing: '4px', outline: 'none' }} />
              </div>
              <button type="submit" disabled={loading} style={{ background: 'var(--mint)', color: 'var(--bg-deepest)', border: 'none', padding: 14, borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8 }}>{loading ? 'Verifying...' : 'Verify & Login'}</button>
              <button type="button" onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>Back to Login</button>
            </form>
          ) : (
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mode === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Role</label>
                  <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: "var(--radius-sm)", fontSize: 14, outline: 'none' }}>
                    <option value="director">Global Director</option>
                    <option value="manager">Branch Manager</option>
                    <option value="investor">Investor</option>
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: "var(--radius-sm)", fontSize: 14, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={{ width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: "var(--radius-sm)", fontSize: 14, outline: 'none' }} />
              </div>
              <button type="submit" disabled={loading} style={{ background: 'var(--mint)', color: 'var(--bg-deepest)', border: 'none', padding: 14, borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8 }}>
                {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
              
              <div style={{ textAlign: 'center', marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                </span>
                <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: 'var(--mint)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {mode === 'login' ? 'Sign Up' : 'Log In'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

// ── Main Page Component ──────────────────────────────────────────────────
  const ChildcareOSPage = ({ onNavigate }) => {
    const [windowWidth] = useWindowSize();
    const isMobile = windowWidth < 768;
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [isSupabaseLoading, setIsSupabaseLoading] = React.useState(true);

    const [currentUser, setCurrentUser] = React.useState(null);
    const [globalMessages, setGlobalMessages] = React.useState(INITIAL_GLOBAL_MESSAGES);

    const [activeTab, setActiveTab] = React.useState('overview');
    const [selectedCenterId, setSelectedCenterId] = React.useState('all');

    React.useEffect(() => {
      let isMounted = true;
      let subscription = null;

      const fetchData = async () => {
        if (!supabase) {
          if (isMounted) setIsSupabaseLoading(false);
          return;
        }
        try {
          const { data: childrenData, error: childErr } = await supabase.from('children').select('*');
          if (childErr) throw childErr;
          
          const { data: messagesData, error: msgErr } = await supabase.from('global_messages').select('*');
          if (msgErr) throw msgErr;

          if (isMounted) {
            if (childrenData && childrenData.length > 0) {
               const updatedCenters = [...CENTERS];
               let mergedChildren = childrenData.sort((a,b) => a.id - b.id);
               try {
                 const localNewChildren = JSON.parse(localStorage.getItem('localNewChildren') || '[]');
                 mergedChildren = [...mergedChildren, ...localNewChildren];
               } catch (e) {}
               updatedCenters[0].children = mergedChildren;
               setCentersData(updatedCenters);
            }
            if (messagesData && messagesData.length > 0) {
               const mappedMsgs = messagesData.map(m => ({
                 id: m.id,
                 threadId: m.threadid || m.threadId,
                 fromRole: m.fromrole || m.fromRole,
                 fromName: m.fromname || m.fromName,
                 toRole: m.torole || m.toRole,
                 toName: m.toname || m.toName,
                 branchId: m.branchid || m.branchId,
                 text: m.text,
                 time: m.time
               }));
               setGlobalMessages(mappedMsgs.sort((a,b) => a.id - b.id));
            }
          }

          // Agent Nia: Realtime Sync Subscription
          subscription = supabase.channel('amani-os-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, (payload) => {
               // Update local state when a child changes
               setCentersData(prevCenters => {
                 const newCenters = [...prevCenters];
                 if (payload.eventType === 'UPDATE') {
                    const idx = newCenters[0].children.findIndex(c => c.id === payload.new.id);
                    if (idx !== -1) newCenters[0].children[idx] = payload.new;
                 }
                 return newCenters;
               });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'global_messages' }, (payload) => {
               // Update local messages when a message is added
               setGlobalMessages(prevMsgs => {
                 if (payload.eventType === 'INSERT') {
                    return [...prevMsgs, payload.new].sort((a,b) => a.id - b.id);
                 }
                 return prevMsgs;
               });
            })
            .subscribe();

        } catch (e) {
          console.error("Error fetching Supabase data:", e);
        } finally {
          if (isMounted) setIsSupabaseLoading(false);
        }
      };
      fetchData();

      let authSubscription = null;
      if (supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session && isMounted) {
            const role = (session.user && session.user.user_metadata && session.user.user_metadata.role) || 'parent';
            const fullName = (session.user && session.user.user_metadata && session.user.user_metadata.full_name) || (session.user && session.user.email) || 'User';
            const childId = (session.user && session.user.user_metadata && session.user.user_metadata.childId) || null;
            let updatedUser = { ...session.user, role, name: fullName, childId };
            setCurrentUser(updatedUser);
            if (role === 'director' || role === 'investor') setActiveTab('owner-view');
            else if (role === 'manager') setActiveTab('operations');
          }
        });

        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session && isMounted) {
            const role = (session.user && session.user.user_metadata && session.user.user_metadata.role) || 'parent';
            const fullName = (session.user && session.user.user_metadata && session.user.user_metadata.full_name) || (session.user && session.user.email) || 'User';
            const childId = (session.user && session.user.user_metadata && session.user.user_metadata.childId) || null;
            let updatedUser = { ...session.user, role, name: fullName, childId };
            setCurrentUser(updatedUser);
            if (role === 'director' || role === 'investor') setActiveTab('owner-view');
            else if (role === 'manager') setActiveTab('operations');
          } else if (isMounted) {
            setCurrentUser(null);
          }
        });
        authSubscription = authSub;
      }

      return () => {
        isMounted = false;
        if (subscription) {
          supabase.removeChannel(subscription);
        }
        if (authSubscription) authSubscription.unsubscribe();
      };
    }, []);

    React.useEffect(() => {
      const hash = window.location.hash.replace('#', '');
      const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const rParam = urlParams.get('r');
      const tParam = urlParams.get('t');
      
      const allChildren = centersData.flatMap(c => c.children);

      // Handle Parent Personal Link Auto-Login
      if (rParam && tParam === 'charis-childcare') {
        const child = allChildren.find(c => c.parent === rParam);
        if (child) {
          setCurrentUser({ role: 'parent', name: child.parent, childId: child.id });
          return;
        }
      }
      
      if (!hash) return;
      
      if (hash === 'director') {
        setCurrentUser({ role: 'director', name: 'Global Director' });
        setActiveTab('owner-view');
      } else if (hash === 'investor') {
        setCurrentUser({ role: 'investor', name: 'Investor Group' });
        setActiveTab('owner-view');
      } else if (hash.startsWith('manager/')) {
        const branchId = hash.split('/')[1];
        setCurrentUser({ role: 'manager', name: 'Branch Manager', branchId });
        setSelectedCenterId(branchId);
        setActiveTab('operations');
      } else if (hash.startsWith('parent/')) {
        const childId = hash.split('/')[1];
        // Parse childId as integer because SQL table uses integer IDs
        const child = allChildren.find(c => c.id === parseInt(childId) || c.id === childId);
        if (child) {
          setCurrentUser({ role: 'parent', name: child.parent, childId: child.id });
        }
      }
    }, [centersData]);
    const [selectedChild, setSelectedChild] = React.useState(null);
    const [niaOpen, setNiaOpen] = React.useState(false);
    const [centersData, setCentersData] = React.useState(() => {
      const initialCenters = [...CENTERS];
      try {
        const localNewChildren = JSON.parse(localStorage.getItem('localNewChildren') || '[]');
        if (localNewChildren.length > 0 && initialCenters[0]) {
          initialCenters[0] = { ...initialCenters[0], children: [...initialCenters[0].children, ...localNewChildren] };
        }
      } catch (e) {}
      return initialCenters;
    });
    const [onboardingOpen, setOnboardingOpen] = React.useState(false);
    const [onboardingReport, setOnboardingReport] = React.useState(null);
    const [onboardingBirthday, setOnboardingBirthday] = React.useState('');
    const [onboardingAgeYears, setOnboardingAgeYears] = React.useState('');
    const [onboardingVaccines, setOnboardingVaccines] = React.useState(['BCG', 'Polio 0']);
    const [onboardingParentEmail, setOnboardingParentEmail] = React.useState('');
    const [onboardingParentPassword, setOnboardingParentPassword] = React.useState('');
    const [qrScannerOpen, setQrScannerOpen] = React.useState(false);
    const [scannedChildId, setScannedChildId] = React.useState(null);

    // Staff System / Rota State
    const [staffData, setStaffData] = React.useState([
      { id: 's1', name: 'Ms. Sarah', role: 'Lead Teacher', shift: 'Morning', hours: '07:00 - 15:00', status: 'active', room: 'Toddler Room' },
      { id: 's2', name: 'Ms. Maria L.', role: 'Assistant', shift: 'Opening', hours: '06:30 - 14:30', status: 'active', room: 'Infant Room' },
      { id: 's3', name: 'Mr. David', role: 'Teacher', shift: 'Afternoon', hours: '10:00 - 18:00', status: 'active', room: 'Preschool' },
      { id: 's4', name: 'Ms. Joy', role: 'Float/Cover', shift: 'Midday', hours: '11:00 - 15:00', status: 'active', room: 'Float' },
    ]);
    const [onCallPool, setOnCallPool] = React.useState([
      { id: 'oc1', name: 'Ms. Florence', role: 'Substitute', phone: '+256 700 000 001' },
      { id: 'oc2', name: 'Mr. Kato', role: 'Substitute', phone: '+256 700 000 002' },
    ]);

    // Finance & Inventory State
    const [pettyCashTransactions, setPettyCashTransactions] = React.useState([
      { id: 'pc1', branch: 'charis-kampala', requester: 'Branch Manager', description: 'Emergency First Aid Supplies', amount: 45000, status: 'approved', date: '2026-07-18' },
      { id: 'pc2', branch: 'charis-kampala', requester: 'Branch Manager', description: 'Staff Water/Refreshments', amount: 15000, status: 'pending', date: '2026-07-20' },
    ]);
    const [inventoryItems, setInventoryItems] = React.useState([
      { id: 'inv1', item: 'Giant Sandbox (2m x 2m)', category: 'Playground', supplier: 'Game Stores Kampala', qty: 1, minQty: 1, cost: 450000, date: '2026-07-15' },
      { id: 'inv2', item: 'Inflatable Mini Pool', category: 'Playground', supplier: 'Kikubo Importers', qty: 2, minQty: 1, cost: 120000, date: '2026-07-12' },
      { id: 'inv3', item: 'Montessori Wooden Toys Set', category: 'Toys', supplier: 'Aristoc Booklex', qty: 5, minQty: 3, cost: 250000, date: '2026-07-10' },
      { id: 'inv4', item: 'Play Mats (Interlocking foam)', category: 'Safety', supplier: 'Nina Interiors', qty: 20, minQty: 10, cost: 300000, date: '2026-07-05' },
      { id: 'inv5', item: 'Diapers (Pampers Size 4)', category: 'Consumables', supplier: 'Capital Shoppers', qty: 2, minQty: 5, cost: 90000, date: '2026-07-02' },
      { id: 'inv6', item: 'Posho (100kg)', category: 'Food', supplier: 'Nakawa Market', qty: 1, minQty: 2, cost: 300000, date: '2026-07-01' },
    ]);

    // Expansion State
    const [expansionProjects, setExpansionProjects] = React.useState([
      { 
        id: 'exp1', 
        name: 'Entebbe Branch', 
        status: 'In Progress', 
        launchDate: '2026-10-01',
        phases: [
          { name: 'Phase 1: Site & Foundation', status: 'completed', description: 'Lease signed, financial model approved.' },
          { name: 'Phase 2: Compliance & Buildout', status: 'in-progress', description: 'Fire inspection pending, flooring installation 80% complete.' },
          { name: 'Phase 3: Hiring & Training', status: 'pending', description: 'Branch Manager hired. Awaiting educator recruitment.' },
          { name: 'Phase 4: Marketing & Pre-Enrollment', status: 'pending', description: 'Waitlist activation and open house scheduled for late September.' }
        ]
      }
    ]);
    // Compliance & Licensing State
    const [complianceRecords, setComplianceRecords] = React.useState([
      { id: 'comp1', name: 'Fire Safety Certificate', type: 'Facility', expirationDate: '2026-08-15', status: 'expiring-soon' },
      { id: 'comp2', name: 'Ministry of Education License', type: 'Facility', expirationDate: '2027-01-10', status: 'valid' },
      { id: 'comp3', name: 'Liability Insurance Policy', type: 'Facility', expirationDate: '2026-09-01', status: 'expiring-soon' },
      { id: 'comp4', name: 'Food Handling (Chef Sarah)', type: 'Staff', expirationDate: '2026-07-28', status: 'critical' }
    ]);

    // Growth Engine State
    const [growthMetrics, setGrowthMetrics] = React.useState({
      activeWaitlist: 14,
      toursBookedThisWeek: 3,
      referralsPending: 2
    });

    const [showAlumni, setShowAlumni] = React.useState(false);

    // Parent Feedback State
    const [parentFeedback, setParentFeedback] = React.useState([
      { id: 1, parent: 'Mrs. Nakamya', rating: 5, comment: 'Aiden loves the new art class!', date: '2026-07-19' },
      { id: 2, parent: 'Mr. Byaruhanga', rating: 3, comment: 'Pickup line was a bit slow on Tuesday.', date: '2026-07-18' }
    ]);

    // Finance Module States
    const [ledgerEntries, setLedgerEntries] = React.useState(INITIAL_LEDGER);
    const [expenseRequests, setExpenseRequests] = React.useState([]);
    const [payrollRuns, setPayrollRuns] = React.useState([]);
    const [recurringBills, setRecurringBills] = React.useState([
      { id: 'rb-1', vendor: 'Umeme (Electricity)', amount: 150000, frequency: 'monthly', nextDue: '2026-08-05' },
      { id: 'rb-2', vendor: 'Kampala Rent', amount: 1200000, frequency: 'monthly', nextDue: '2026-08-01' }
    ]);



    // Billing Engine State
    const [wallets, setWallets] = React.useState([
      { id: 'w1', name: 'Operations', allocationPct: 60, balance: 2500000, color: 'var(--mint)' },
      { id: 'w2', name: 'Expansion', allocationPct: 15, balance: 800000, color: 'var(--info)' },
      { id: 'w3', name: 'Savings & Reserves', allocationPct: 25, balance: 1200000, color: 'var(--gold)' }
    ]);
    const [invoices, setInvoices] = React.useState([
      { id: 'inv-1', parent: 'Mrs. Nakamya', child: 'Aiden', amount: 450000, status: 'paid', date: '2026-07-01', dueDate: '2026-07-05' },
      { id: 'inv-2', parent: 'Mr. Byaruhanga', child: 'Kato', amount: 150000, status: 'pending', date: '2026-07-15', dueDate: '2026-07-20' },
      { id: 'inv-3', parent: 'Ms. Omondi', child: 'Mia', amount: 450000, status: 'overdue', date: '2026-06-01', dueDate: '2026-06-05' }
    ]);
    
    const [invoiceViewMode, setInvoiceViewMode] = React.useState('register'); // 'register' or 'ledger'
    const [ledgerRows, setLedgerRows] = React.useState([
      { id: 'l1', childId: 'c1', childName: 'Aiden Nakamya', plan: 'daily', signIn: '07:30 AM', signOut: '04:30 PM', hours: 9, cost: 135000, status: 'unbilled', date: new Date().toISOString().split('T')[0] },
      { id: 'l2', childId: 'c2', childName: 'Mia Omondi', plan: 'monthly', signIn: '08:00 AM', signOut: '05:00 PM', hours: 9, cost: 0, status: 'billed', date: new Date().toISOString().split('T')[0] }
    ]);

    const handleSignOut = (child) => {
      const now = new Date();
      // Mock logic: assume signed in at 08:00 AM, calculate elapsed hours roughly.
      // For demonstration, we just generate a random elapsed time or say 8 hours.
      const elapsedHours = 8.5; 
      
      // Hourly Drop-in is 15,000 UGX/hour. Monthly is 0 (covered).
      const cost = child.carePlan === 'daily' ? elapsedHours * 15000 : 0;
      
      const newRow = {
        id: 'l' + Date.now(),
        childId: child.id,
        childName: child.name,
        plan: child.carePlan,
        signIn: '08:00 AM',
        signOut: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hours: elapsedHours,
        cost: cost,
        status: 'unbilled',
        date: now.toISOString().split('T')[0]
      };
      
      setLedgerRows(prev => [newRow, ...prev]);
      
      // Show an alert to user
      alert(`Signed out ${child.name}. Ledger updated: ${elapsedHours} hrs recorded (Cost: ${cost.toLocaleString()} UGX).`);
    };

    const kpi = React.useMemo(() => {
      if (selectedCenterId !== 'all') {
        const center = centersData.find(c => c.id === selectedCenterId);
        return center ? center.kpi : centersData[0].kpi;
      }
      const agg = {
        enrolled: 0, presentToday: 0, absentToday: 0, caretakers: 0,
        invoicesDue: 0, invoicesOverdue30d: 0, overdueAmount: 0,
        totalInvoiced: 0, unreadParentMessages: 0, unansweredMessages24h: 0,
        milestonesThisWeek: 0, activitiesScheduledToday: 0,
      };
      centersData.forEach(c => {
        agg.enrolled += c.kpi.enrolled;
        agg.presentToday += c.kpi.presentToday;
        agg.absentToday += c.kpi.absentToday;
        agg.caretakers += c.kpi.caretakers || 0;
        agg.invoicesDue += c.kpi.invoicesDue;
        agg.invoicesOverdue30d += c.kpi.invoicesOverdue30d;
        agg.overdueAmount += c.kpi.overdueAmount;
        agg.totalInvoiced += c.kpi.totalInvoiced;
        agg.unreadParentMessages += c.kpi.unreadParentMessages;
        agg.unansweredMessages24h += c.kpi.unansweredMessages24h;
        agg.milestonesThisWeek += c.kpi.milestonesThisWeek;
        agg.activitiesScheduledToday += c.kpi.activitiesScheduledToday;
      });
      agg.attendanceRate = agg.enrolled ? (agg.presentToday / agg.enrolled) : 0;
      agg.collectionRate = agg.totalInvoiced ? ((agg.totalInvoiced - agg.overdueAmount) / agg.totalInvoiced) : 0;

      agg.attendanceRate = agg.enrolled > 0 ? agg.presentToday / agg.enrolled : 0;
      agg.collectionRate = agg.totalInvoiced > 0 ? (agg.totalInvoiced - agg.overdueAmount) / agg.totalInvoiced : 0;
      return agg;
    }, [selectedCenterId, centersData]);

    const childrenData = React.useMemo(() => {
      if (selectedCenterId === 'all') return centersData.flatMap(c => c.children);
      const center = centersData.find(c => c.id === selectedCenterId); return center ? center.children : [];
    }, [selectedCenterId, centersData]);


    const TODAY_SCHEDULE = React.useMemo(() => {
      if (selectedCenterId === 'all') return centersData[0].schedule;
      const center = centersData.find(c => c.id === selectedCenterId); return center ? center.schedule : [];
    }, [selectedCenterId, centersData]);

    const MESSAGES = React.useMemo(() => {
      if (selectedCenterId === 'all') return centersData.flatMap(c => c.messages);
      const center = centersData.find(c => c.id === selectedCenterId); return center ? center.messages : [];
    }, [selectedCenterId, centersData]);

    const CAMERAS = React.useMemo(() => {
      if (selectedCenterId === 'all') return centersData.flatMap(c => c.cameras);
      const center = centersData.find(c => c.id === selectedCenterId); return center ? center.cameras : [];
    }, [selectedCenterId, centersData]);

    const currentSlot = getCurrentTimeSlot(TODAY_SCHEDULE);

    React.useEffect(() => {
      if (activeTab === 'cameras' && typeof window !== 'undefined' && window.JSMpeg) {
        let players = [];
        const setupPlayer = (id, port) => {
          const canvas = document.getElementById(id);
          if (canvas) {
            players.push(new window.JSMpeg.Player(`ws://127.0.0.1:${port}`, { canvas: canvas, autoplay: true, loop: true }));
          }
        };
        const timer = setTimeout(() => {
          CAMERAS.forEach(cam => {
            if (cam.wsPort) setupPlayer(`camera-canvas-${cam.id}`, cam.wsPort);
          });
        }, 300);
        return () => {
          clearTimeout(timer);
          players.forEach(p => p.destroy());
        };
      }
    }, [activeTab]);

    function handleMessage(child) {
      const url = 'https://wa.me/' + child.parentPhone + '?text=' + encodeURIComponent(
        'Hello ' + child.parent + ', this is a message from the Amani team regarding ' + child.name + '. '
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    if (isSupabaseLoading) {
      return (
        <div style={{ width: '100%', height: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deepest)', fontFamily: 'var(--font-body)', color: 'var(--mint)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>☁️</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Syncing with Supabase...</div>
          </div>
        </div>
      );
    }

    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const passId = urlParams.get('pass');
    if (passId) {
      const allChildren = centersData.flatMap(c => c.children);
      const child = allChildren.find(c => c.id.toString() === passId);
      if (!child) {
         return <div style={{ background: 'var(--bg-deepest)', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Pass not found or invalid.</div>;
      }
      return (
        <div style={{ background: 'var(--bg-deepest)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', color: '#fff', padding: 20 }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: "var(--radius-lg)", padding: 40, border: '1px solid var(--mint)', width: '100%', maxWidth: 400, textAlign: 'center', boxShadow: '0 20px 40px rgba(6,214,160,0.1)' }}>
             <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(6,214,160,0.2)', color: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 24px' }}>✓</div>
             <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 24px', color: 'var(--mint)', fontFamily: 'var(--font-display)' }}>Authorized Match</h2>
             <img src={child.photoUrl} alt={child.name} style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-default)', boxShadow: '0 0 0 2px var(--mint)', margin: '0 auto 20px' }} />
             <h3 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>{child.name}</h3>
             <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>Status: {child.present ? 'Present' : 'Absent'}</div>

             <div style={{ display: 'flex', gap: '12px', marginBottom: 24 }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 700 }}>Time Arrived</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--mint)' }}>07:30 AM</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 700 }}>Time Leaving</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--mint)' }}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
             </div>
             
             <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: "var(--radius-md)" }}>
               <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}><strong style={{ color: '#fff' }}>Primary Parent:</strong> {child.parent}</div>
               <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: child.carePlan !== 'monthly' ? 8 : 0 }}><strong style={{ color: '#fff' }}>Authorized Pickups:</strong> {child.authorizedPickups || 'Parents only'}</div>
               {child.carePlan !== 'monthly' && (
                 <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                   <strong style={{ color: '#fff' }}>Payment Status:</strong>{' '}
                   <span style={{ 
                     color: child.invoiceStatus === 'paid' ? 'var(--mint)' : child.invoiceStatus === 'due' ? 'var(--gold)' : 'var(--danger)',
                     fontWeight: 700, textTransform: 'uppercase'
                   }}>
                     {child.invoiceStatus}
                   </span>
                 </div>
               )}
             </div>
          </div>
        </div>
      );
    }

    if (!currentUser) {
      return (
        <AuthScreen 
          supabase={supabase} 
          onLogin={(user) => {
            const role = (user && user.user_metadata && user.user_metadata.role) || 'parent';
            const fullName = (user && user.user_metadata && user.user_metadata.full_name) || (user && user.email) || 'User';
            const childId = (user && user.user_metadata && user.user_metadata.childId) || null;
            let updatedUser = { ...user, role, name: fullName, childId };
            if (role === 'director' || role === 'investor') {
              setActiveTab('owner-view');
            } else if (role === 'manager') {
              setActiveTab('operations');
            }
            setCurrentUser(updatedUser);
          }} 
        />
      );
    }

    if (currentUser.role === 'parent') {
      const handleUpdateChildrenData = (updater) => {
        setCentersData(prev => prev.map(c => ({
          ...c,
          children: typeof updater === 'function' ? updater(c.children || []) : updater
        })));
      };
      return <ParentApp user={currentUser} childrenData={childrenData} setChildrenData={handleUpdateChildrenData} scheduleData={TODAY_SCHEDULE} onLogout={() => supabase ? supabase.auth.signOut() : setCurrentUser(null)} globalMessages={globalMessages} setGlobalMessages={setGlobalMessages} setParentFeedback={setParentFeedback} />;
    }

    const tabs = [
      { id: 'owner-view',  label: 'Owner View', icon: '📊', roles: ['director', 'investor'] },
      { id: 'operations', label: 'Operations', icon: '📋', roles: ['director', 'manager'] },
      { id: 'rota', label: 'Staff Rota', icon: '👥', roles: ['director', 'manager'] },
      { id: 'children',  label: 'Children', icon: '🧒', roles: ['director', 'manager'] },
      { id: 'schedule',  label: 'Schedule', icon: '🗓️', roles: ['director', 'manager'] },
      { id: 'messages',  label: 'Messages', icon: '💬', badge: kpi.unreadParentMessages, roles: ['director', 'manager', 'investor'] },
      { id: 'finances',  label: 'Finances', icon: '📈', roles: ['director', 'manager', 'investor'] },
      { id: 'expansion', label: 'Expansion', icon: '🚀', roles: ['director', 'investor'] },
    ];
    if (selectedCenterId === 'all') tabs.push({ id: 'inventory', label: 'Inventory', icon: '📦', roles: ['director', 'manager'] });
    tabs.push({ id: 'cameras',   label: 'Live Cameras', icon: '🎥', roles: ['director', 'manager'] });

    const filteredTabs = tabs.filter(t => t.roles.includes(currentUser.role));

    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-default)' }}>
        {/* ── SIDEBAR ── */}
        <div style={{
          width: 260, background: 'var(--bg-elevated)', borderRight: '1px solid var(--border-subtle)',
          padding: '32px 20px', display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, bottom: 0, left: isMobile ? (mobileMenuOpen ? 0 : -260) : 0,
          transition: 'left 0.3s ease', overflowY: 'auto', zIndex: 100,
          boxShadow: isMobile && mobileMenuOpen ? '4px 0 20px rgba(0,0,0,0.5)' : 'none'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, paddingLeft: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "var(--radius-md)",
                background: 'linear-gradient(135deg, var(--gold), #FF8C00)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, boxShadow: '0 4px 20px rgba(255,209,102,0.3)', flexShrink: 0
              }}>👶</div>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                  Amani OS
                </h1>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 2, textTransform: 'uppercase' }}>
                  {currentUser.role}
                </div>
                <button onClick={() => supabase ? supabase.auth.signOut() : setCurrentUser(null)} style={{ marginTop: 8, padding: '4px 8px', background: 'var(--bg-deepest)', border: 'none', color: 'var(--text-secondary)', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>LOGOUT</button>
              </div>
            </div>
            {isMobile && (
              <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 20, cursor: 'pointer', padding: 4 }}>
                ✕
              </button>
            )}
          </div>

          {/* Center Selector */}
          {currentUser.role === 'director' && (
            <div style={{ marginBottom: 30, paddingLeft: 8, paddingRight: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Facility</div>
              <select 
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: "var(--radius-sm)",
                  background: 'var(--bg-default)', border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', outline: 'none'
                }}
              >
                <option value="all">🌐 All Centers (Global)</option>
                {centersData.map(c => (
                  <option key={c.id} value={c.id}>📍 {c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Navigation Menu */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingLeft: 12 }}>Menu</div>
            {filteredTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                background: activeTab === tab.id ? 'rgba(6,214,160,0.08)' : 'transparent',
                border: 'none', cursor: 'pointer', padding: '12px 14px', fontSize: 14,
                fontWeight: activeTab === tab.id ? 600 : 500,
                color: activeTab === tab.id ? 'var(--mint)' : 'var(--text-secondary)',
                borderRadius: 10, transition: 'all 0.15s', fontFamily: 'var(--font-body)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>{tab.icon}</span>
                  {tab.label}
                </div>
                {tab.badge > 0 && (
                  <span style={{ background: 'var(--warning)', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button onClick={() => setNiaOpen(true)} style={{
            background: 'linear-gradient(135deg, rgba(6,214,160,0.1), rgba(6,214,160,0.02))',
            border: '1px solid rgba(6,214,160,0.2)', borderRadius: "var(--radius-md)", padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 12, marginTop: 40, cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'left'
          }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--mint), var(--emerald))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--mint)' }}>Talk to Nia</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>AI Chief of Staff</div>
            </div>
          </button>

          <ShareLinkPanel role={currentUser.role} branchId={currentUser.branchId} />
        </div>

        {/* ── MAIN CONTENT AREA ── */}
        <div style={{ flex: 1, padding: isMobile ? '20px' : '40px 60px', marginLeft: isMobile ? 0 : 260, transition: 'margin-left 0.3s ease', overflowX: 'hidden' }}>
          {/* Top Bar inside content */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {isMobile && (
                <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 28, cursor: 'pointer', padding: 0 }}>
                  ☰
                </button>
              )}
              <div>
                <div style={{ fontSize: 13, color: 'var(--mint)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 22 : 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {tabs.find(t => t.id === activeTab) ? tabs.find(t => t.id === activeTab).label : ''}
                </h2>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Welcome back, Hudson Tumusiime
            </div>
          </div>

        {/* Nia Banner */}
        <NiaAdvisoryBanner onTalkToNia={() => setNiaOpen(true)} />

        {/* ── OPERATIONS TAB ── */}
        {activeTab === 'operations' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Operations Wall Tablet</h2>
            <OperationsWallTablet center={centersData.find(c => c.id === selectedCenterId) || centersData[0]} childrenData={childrenData} onSignOut={handleSignOut} onOpenScanner={() => setQrScannerOpen(true)} globalMessages={globalMessages} />

            <div style={{ marginTop: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 20, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Absence Follow-up</h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Today (After 9:30 AM)</div>
                  <button onClick={async () => {
                    const absentChildren = childrenData.filter(c => !c.present && !c.isAlumni);
                    if (absentChildren.length === 0) {
                      alert('No absent children to follow up with.');
                      return;
                    }
                    if (!window.supabase) {
                      alert('Supabase not connected.');
                      return;
                    }
                    try {
                      const msgs = absentChildren.map(c => ({
                        threadid: `parent-${c.id}`,
                        fromrole: currentUser.role,
                        fromname: currentUser.name,
                        torole: 'parent',
                        toname: c.parent,
                        branchid: 'charis-kampala',
                        text: `Hello ${c.parent}, we noticed ${c.name} is absent today. We missed them! Please let us know if everything is okay.`,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }));
                      setGlobalMessages(prev => [...prev, ...msgs]);
                      await window.supabase.createClient('https://eztgwiujujaxswlslqbf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dGd3aXVqdWpheHN3bHNscWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzE5NjEsImV4cCI6MjA5ODc0Nzk2MX0.mzyC4DLlC-s3YznfQLTfNxa227_hQlLAt0VhL_dGxr0').from('global_messages').insert(msgs);
                      alert(`Sent follow-up messages to ${msgs.length} parents via Agent Nia!`);
                    } catch(e) { console.error(e); }
                  }} style={{ background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Auto-Send Follow-ups (Agent Nia)
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {childrenData.filter(c => !c.present && !c.isAlumni).map(child => (
                  <div key={child.id} style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: "var(--radius-md)", border: '1px solid var(--gold)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <img src={child.photoUrl} alt={child.name} style={{ width: 40, height: 40, borderRadius: '50%' }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{child.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{child.absenceReason ? `Absent: ${child.absenceReason}` : 'Absent Unexplained'}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      Contact: {child.parent} ({child.parentPhone})
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a href={`tel:${child.parentPhone}`} style={{ flex: 1, padding: '8px', background: 'var(--mint)', color: 'var(--text-inverse)', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Call Parent</a>
                      <button onClick={() => {
                        const reason = prompt('Enter the absence reason:');
                        if(reason) {
                          setCentersData(prev => prev.map(c => c.id === selectedCenterId || selectedCenterId === 'all' ? { ...c, children: c.children.map(ch => ch.id === child.id ? { ...ch, absenceReason: reason } : ch) } : c));
                          alert(`Reason logged: ${reason}`);
                        }
                      }} style={{ flex: 1, padding: '8px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Log Reason</button>
                    </div>
                  </div>
                ))}
                {childrenData.filter(c => !c.present && !c.isAlumni).length === 0 && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>All scheduled children are accounted for.</div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 20, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Parent Pulse (CSAT)</h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Last 7 Days</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {parentFeedback.map(fb => (
                  <div key={fb.id} style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: "var(--radius-md)", border: '1px solid ' + (fb.rating <= 3 ? 'var(--danger)' : 'var(--border-subtle)') }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{fb.parent}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{fb.date}</span>
                    </div>
                    <div style={{ fontSize: 16, marginBottom: 8 }}>
                      {'⭐'.repeat(fb.rating)}{'🌑'.repeat(5 - fb.rating)}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>"{fb.comment}"</div>
                    {fb.rating <= 3 && (
                      <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255, 71, 87, 0.1)', color: 'var(--danger)', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⚠️</span> Action Required: Follow-up Call
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STAFF ROTA TAB ── */}
        {activeTab === 'rota' && (
          <StaffRotaSystem staffData={staffData} setStaffData={setStaffData} onCallPool={onCallPool} />
        )}

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'owner-view' && (
          <React.Fragment>
            {/* KPI Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 32 }}>
              <CcKpiCard label="Enrolled" value={kpi.enrolled} sub="July cohort" accent="var(--mint)" icon="🧒" />
              <CcKpiCard label="Present Today" value={kpi.presentToday} sub={`${kpi.absentToday} absent`} accent="var(--info)" icon="✅" />
              <CcKpiCard label="Attendance" value={Math.round(kpi.attendanceRate * 100) + '%'} sub="Target: 90%+" accent={kpi.attendanceRate >= 0.9 ? 'var(--mint)' : 'var(--gold)'} icon="📊" />
              {selectedCenterId === 'all' ? (
                <CcKpiCard label="Staff Payments" value={'UGX ' + ((kpi.caretakers || 0) * 800000).toLocaleString()} sub={`${kpi.caretakers || 0} active staff`} accent="var(--danger)" icon="💳" />
              ) : (
                <CcKpiCard label="Invoices Due" value={kpi.invoicesDue} sub={kpi.invoicesOverdue30d + ' overdue 30d+'} accent="var(--danger)" icon="💳" />
              )}
              <CcKpiCard label="Messages" value={kpi.unreadParentMessages} sub={kpi.unansweredMessages24h + ' need reply'} accent="var(--warning)" icon="💬" />
              <CcKpiCard label="Milestones" value={kpi.milestonesThisWeek} sub="This week" accent="var(--gold)" icon="🏆" />
            </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
            {/* Today's Pulse */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Today's Pulse</div>
              {[
                { label: 'Present', val: kpi.presentToday, total: kpi.enrolled, color: 'var(--mint)' },
                { label: 'Fee Collection', val: Math.round(kpi.collectionRate * 100), total: 100, color: 'var(--info)', pct: true },
                { label: 'Attendance Rate', val: Math.round(kpi.attendanceRate * 100), total: 100, color: 'var(--gold)', pct: true },
              ].map(({ label, val, total, color, pct }) => (
                <div key={label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color }}>{pct ? val + '%' : val + '/' + total}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-surface)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: (pct ? val : Math.round(val / total * 100)) + '%', background: color, borderRadius: 4, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Next Activity */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Today's Schedule</div>
              {TODAY_SCHEDULE.slice(0, 5).map((slot, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px',
                  borderRadius: "var(--radius-sm)", marginBottom: 4,
                  background: i === currentSlot ? 'rgba(6,214,160,0.08)' : 'transparent',
                  border: i === currentSlot ? '1px solid rgba(6,214,160,0.2)' : '1px solid transparent',
                }}>
                  <span style={{ fontSize: 16 }}>{slot.icon || '🕒'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: i === currentSlot ? 'var(--mint)' : 'var(--text-secondary)', fontWeight: i === currentSlot ? 600 : 400 }}>{slot.activity}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{slot.caretaker || 'Staff'}</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{slot.time}</div>
                  <button onClick={() => {
                    const newActivity = prompt(`Edit activity for ${slot.time}:`, slot.activity);
                    if (newActivity !== null) {
                      setCentersData(prev => prev.map(c => c.id === selectedCenterId || selectedCenterId === 'all' ? {
                        ...c,
                        schedule: c.schedule.map((s, idx) => idx === i ? { ...s, activity: newActivity } : s)
                      } : c));
                    }
                  }} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>Edit</button>
                </div>
              ))}
              <button onClick={() => setActiveTab('schedule')} style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: "var(--radius-sm)", padding: '6px 12px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', width: '100%', marginTop: 8, fontFamily: 'var(--font-body)' }}>
                View full schedule →
              </button>
            </div>

            {/* Immunisation Alerts */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>⚠️ Immunisation Alerts</div>
              {(() => {
                const alerts = childrenData.map(c => ({ child: c, vac: calculateVaccineStatus(c) }))
                  .filter(item => item.vac.due.length > 0)
                  .slice(0, 5);
                if (alerts.length === 0) return <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>All children are up to date!</div>;
                return alerts.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.child.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--gold)' }}>Overdue: {item.vac.due.join(', ')}</div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Recent Milestones */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Recent Milestones</div>
              {childrenData.filter(c => c.milestone).slice(0, 5).map(child => (
                <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 20 }}>{child.mood}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{child.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--mint)' }}>🏆 {child.milestone}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Quick Actions</div>
              {[
                { label: '📣 Broadcast to All Parents', action: () => { const url = 'https://wa.me/?text=' + encodeURIComponent('Hello from Amani! '); window.open(url, '_blank'); } },
                { label: '💬 View Messages', action: () => setActiveTab('messages') },
                { label: selectedCenterId === 'all' ? '📊 View Finances' : '📋 View Invoices', action: () => setActiveTab('invoices') },
                { label: '🛡️ Ask Nia for Advisory', action: () => setNiaOpen(true) },
              ].map(({ label, action }) => (
                <button key={label} onClick={action} style={{
                  display: 'block', width: '100%', background: 'transparent',
                  border: '1px solid var(--border-default)', borderRadius: "var(--radius-sm)", padding: '10px 14px',
                  fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left',
                  marginBottom: 8, transition: 'all 0.15s', fontFamily: 'var(--font-body)',
                }} className="quick-action-btn">{label}</button>
              ))}
            </div>
            {/* Expansion Readiness Gate */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20, gridColumn: isMobile ? '1' : '1 / -1' }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Expansion Readiness Gate (6-Month Trend)</div>
              {(() => {
                const past6Months = [
                  { month: 'Feb', score: 78 },
                  { month: 'Mar', score: 81 },
                  { month: 'Apr', score: 84 },
                  { month: 'May', score: 87 },
                  { month: 'Jun', score: 89 },
                  { month: 'Jul', score: 91 }
                ];
                const avgScore = Math.round(past6Months.reduce((a, b) => a + b.score, 0) / 6);
                const isReady = avgScore >= 85;
                
                return (
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 32, alignItems: 'center' }}>
                    <div style={{ flex: 1, width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: 12, borderBottom: '1px solid var(--border-default)', paddingBottom: 8, position: 'relative' }}>
                        {/* 85 Threshold Line */}
                        <div style={{ position: 'absolute', bottom: 'calc(85% + 8px)', left: 0, width: '100%', borderTop: '1px dashed var(--gold)', zIndex: 1 }} />
                        <span style={{ position: 'absolute', bottom: 'calc(85% + 12px)', left: 0, fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>85+ THRESHOLD</span>
                        
                        {past6Months.map(m => (
                          <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 2 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{m.score}</div>
                            <div style={{ width: '100%', background: m.score >= 85 ? 'var(--mint)' : 'var(--bg-hover)', height: `${m.score}%`, borderRadius: '4px 4px 0 0', transition: 'height 1s ease-out' }} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                        {past6Months.map(m => (
                          <div key={m.month} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)' }}>{m.month}</div>
                        ))}
                      </div>
                    </div>
                    
                    <div style={{ width: isMobile ? '100%' : 240, background: isReady ? 'rgba(0, 252, 143, 0.05)' : 'rgba(255, 71, 87, 0.05)', border: `1px solid ${isReady ? 'rgba(0, 252, 143, 0.2)' : 'rgba(255, 71, 87, 0.2)'}`, borderRadius: "var(--radius-md)", padding: 20, textAlign: 'center' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{isReady ? '🔓' : '🔒'}</div>
                      <div style={{ fontSize: 14, color: isReady ? 'var(--mint)' : 'var(--danger)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                        {isReady ? 'Expansion Unlocked' : 'Expansion Locked'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        6-Mo Avg: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{avgScore}/100</span>
                      </div>
                      {!isReady && (
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>Must maintain 85+ average to green-light next branch.</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Growth Engine KPI */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Growth Engine Pipeline</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)', padding: 12, borderRadius: "var(--radius-sm)" }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>⏳ Active Waitlist</span>
                  <span style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--info)' }}>{growthMetrics.activeWaitlist}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)', padding: 12, borderRadius: "var(--radius-sm)" }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📅 Tours Booked (This Week)</span>
                  <span style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--warning)' }}>{growthMetrics.toursBookedThisWeek}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)', padding: 12, borderRadius: "var(--radius-sm)" }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>🎁 Referrals Pending</span>
                  <span style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)' }}>{growthMetrics.referralsPending}</span>
                </div>
              </div>
            </div>

            {/* Compliance & Licensing Tracker */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Compliance Tracker (60-Day Alerts)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {complianceRecords.map(record => {
                  const isExpiring = record.status === 'expiring-soon';
                  const isCritical = record.status === 'critical';
                  const isOk = record.status === 'valid';
                  const color = isCritical ? 'var(--danger)' : isExpiring ? 'var(--gold)' : '#10B981';
                  const icon = isCritical ? '🔴' : isExpiring ? '🟡' : '🟢';
                  
                  return (
                    <div key={record.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)', padding: '10px 12px', borderRadius: "var(--radius-sm)", borderLeft: `4px solid ${color}` }}>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{record.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{record.type} • Expires: {record.expirationDate}</div>
                      </div>
                      <div style={{ fontSize: 16 }}>{icon}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Risk & Continuity Checklist */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Risk & Continuity Readiness</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)', padding: 12, borderRadius: "var(--radius-sm)" }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>🔋 Device Charging Rota Validated</span>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: 'var(--mint)', width: 16, height: 16 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)', padding: 12, borderRadius: "var(--radius-sm)" }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📋 Paper Fallback Packs Stocked</span>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: 'var(--mint)', width: 16, height: 16 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)', padding: 12, borderRadius: "var(--radius-sm)" }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📞 Crisis Comm Playbook Distributed</span>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: 'var(--mint)', width: 16, height: 16 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-deep)', padding: 12, borderRadius: "var(--radius-sm)" }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>🛡️ Insurance Policies Active</span>
                  <input type="checkbox" checked={true} readOnly style={{ accentColor: 'var(--mint)', width: 16, height: 16 }} />
                </div>
              </div>
            </div>

          </div>
          </React.Fragment>
        )}

        {/* ── CHILDREN TAB ── */}
        {activeTab === 'children' && !selectedChild && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, background: 'var(--bg-deep)', padding: 4, borderRadius: "var(--radius-sm)" }}>
                <button onClick={() => setShowAlumni(false)} style={{ background: !showAlumni ? 'var(--bg-elevated)' : 'transparent', color: !showAlumni ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Active Roster</button>
                <button onClick={() => setShowAlumni(true)} style={{ background: showAlumni ? 'var(--bg-elevated)' : 'transparent', color: showAlumni ? 'var(--text-primary)' : 'var(--text-secondary)', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Alumni / Graduated</button>
              </div>
              <button onClick={() => { setOnboardingBirthday(''); setOnboardingAgeYears(''); setOnboardingVaccines(['BCG', 'Polio 0']); setOnboardingParentEmail(''); setOnboardingParentPassword(''); setOnboardingOpen(true); }} style={{ background: 'var(--mint)', color: 'var(--bg-deepest)', border: 'none', borderRadius: "var(--radius-sm)", padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>➕</span> Onboard Child
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {childrenData.filter(c => (showAlumni ? c.isAlumni : !c.isAlumni)).map(child => <ChildCard key={child.id} child={child} onSelect={setSelectedChild} onMessage={handleMessage} />)}
            </div>
          </div>
        )}

        {activeTab === 'children' && selectedChild && (
           <ChildProfileView 
              child={selectedChild} 
              onBack={() => setSelectedChild(null)} 
              onMessage={handleMessage} 
              onUpdateChild={(updatedChild) => setCentersData(prev => prev.map(c => ({ ...c, children: c.children.map(ch => ch.id === updatedChild.id ? updatedChild : ch) })))} 
           />
        )}

        {/* ── CAMERAS TAB ── */}
        {activeTab === 'cameras' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Live feeds from Amani center. AI Milestone tracking is currently active.</div>
              <button style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', borderRadius: "var(--radius-sm)", padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>⚙️ Configure Video Sources</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
              {CAMERAS.map(cam => (
                <div key={cam.id} style={{ background: 'var(--bg-elevated)', borderRadius: "var(--radius-lg)", overflow: 'hidden', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                  {/* Camera Header */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', animation: 'pulse 2s infinite' }}></div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{cam.name}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>1080p • 30fps</span>
                  </div>
                  {/* Real Camera Feed (JSMpeg or MJPEG) */}
                  <div style={{ position: 'relative', width: '100%', height: 220, background: '#111' }}>
                    {cam.mjpegUrl ? (
                      <img src={cam.mjpegUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                    ) : (
                      <canvas id={`camera-canvas-${cam.id}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}></canvas>
                    )}
                    {/* Bounding Boxes */}
                    {cam.children.map((c, i) => (
                      <div key={i} style={{ position: 'absolute', left: c.x + '%', top: c.y + '%', transform: 'translate(-50%, -50%)' }}>
                        <div style={{ border: '2px solid var(--mint)', width: 60, height: 80, borderRadius: "var(--radius-sm)", boxShadow: '0 0 10px rgba(6,214,160,0.3)', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--mint)', borderRadius: 6, padding: '4px 8px', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{c.name}</span>
                            <span style={{ fontSize: 9, color: 'var(--mint)' }}>🏆 {c.milestone}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SCHEDULE TAB ── */}
        {activeTab === 'schedule' && (
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Today's Programme</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  Generated by Global Director Hudson · {new Date().toDateString()}
                </div>
              </div>
            </div>
            {TODAY_SCHEDULE.map((slot, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 16px', borderRadius: 10, marginBottom: 8,
                background: i === currentSlot ? 'rgba(6,214,160,0.06)' : i < currentSlot ? 'rgba(255,255,255,0.02)' : 'transparent',
                border: i === currentSlot ? '1px solid rgba(6,214,160,0.25)' : '1px solid var(--border-subtle)',
                opacity: i < currentSlot ? 0.55 : 1,
                transition: 'all 0.2s',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: (slot.color || '#fff') + '18', border: `1px solid ${(slot.color || '#fff')}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                }}>{slot.icon || '🕒'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: i === currentSlot ? 600 : 400, color: i === currentSlot ? 'var(--mint)' : 'var(--text-primary)' }}>
                    {slot.activity}
                    {i === currentSlot && <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--mint)', color: 'var(--bg-deepest)', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>NOW</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Led by {slot.caretaker || 'Staff'}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{slot.time}</div>
                <button onClick={() => {
                  const newActivity = prompt(`Edit activity for ${slot.time}:`, slot.activity);
                  if (newActivity !== null) {
                    setCentersData(prev => prev.map(c => c.id === selectedCenterId || selectedCenterId === 'all' ? {
                      ...c,
                      schedule: c.schedule.map((s, idx) => idx === i ? { ...s, activity: newActivity } : s)
                    } : c));
                  }
                }} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Edit</button>
              </div>
            ))}
          </div>
        )}

        {/* ── MESSAGES TAB ── */}
        {activeTab === 'messages' && (
          <MessagesPanel
            currentUser={currentUser}
            globalMessages={globalMessages}
            setGlobalMessages={setGlobalMessages}
            childrenData={childrenData}
            centersData={centersData}
          />
        )}

        {/* ── FINANCES TAB ── */}
        {activeTab === 'finances' && (
          <FinanceTab 
            currentUser={currentUser}
            selectedCenterId={selectedCenterId}
            centersData={centersData}
            childrenData={childrenData}
            ledgerEntries={ledgerEntries}
            setLedgerEntries={setLedgerEntries}
            expenseRequests={expenseRequests}
            setExpenseRequests={setExpenseRequests}
            payrollRuns={payrollRuns}
            setPayrollRuns={setPayrollRuns}
            recurringBills={recurringBills}
            setRecurringBills={setRecurringBills}
            pettyCashTransactions={pettyCashTransactions}
            setPettyCashTransactions={setPettyCashTransactions}
            kpi={kpi}
            wallets={wallets}
            setWallets={setWallets}
            invoices={invoices}
            setInvoices={setInvoices}
          />
        )}

        {/* ── INVENTORY TAB ── */}
        {activeTab === 'inventory' && selectedCenterId === 'all' && (
          <InventorySystem currentUser={currentUser} inventoryItems={inventoryItems} setInventoryItems={setInventoryItems} />
        )}

        {/* ── EXPANSION TAB ── */}
        {activeTab === 'expansion' && (
          <ExpansionDashboard expansionProjects={expansionProjects} />
        )}
        
        {/* Nia Overlay */}
        <ChildcareNiaOverlay 
          isOpen={niaOpen} 
          onClose={() => setNiaOpen(false)} 
          contextData={{ kpi: kpi, children: childrenData, schedule: TODAY_SCHEDULE, messages: MESSAGES }}
        />

        {/* Onboarding Drawer Modal */}
        {onboardingOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ background: 'var(--bg-elevated)', width: onboardingReport ? 650 : 500, borderRadius: "var(--radius-lg)", border: '1px solid var(--border-subtle)', padding: 32, position: 'relative' }}>
              <button onClick={() => { setOnboardingOpen(false); setOnboardingReport(null); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 20 }}>×</button>
              
              {!onboardingReport ? (
                <React.Fragment>
                  <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 24px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Onboard New Child</h2>
                    <form id="onboardingForm" onSubmit={e => e.preventDefault()}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Digital Passport Photo URL (Optional)</label><input name="photoUrl" placeholder="https://..." style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                        <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Full Name</label><input name="name" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                        <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Age (years)</label><input name="age" type="number" value={onboardingAgeYears} onChange={e => setOnboardingAgeYears(e.target.value)} style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                        <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Birthday</label><input name="birthday" type="date" value={onboardingBirthday} onChange={e => setOnboardingBirthday(e.target.value)} style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Care Package</label>
                          <select name="carePlan" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }}>
                            <option value="monthly">Monthly Care (Everyday)</option>
                            <option value="weekly">Weekly Care</option>
                            <option value="daily">Daily Care (Drop-in)</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Preferred Payment Method</label>
                          <select name="paymentMethod" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }}>
                            <option value="mobile_money">Mobile Money</option>
                            <option value="card">Card Payment</option>
                          </select>
                        </div>
                        <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Primary Parent Name</label><input name="parent" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                        <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Secondary Parent Name</label><input name="secondaryParent" placeholder="Optional" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                        <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Parent Login Email</label><input name="parentEmail" type="email" value={onboardingParentEmail} onChange={e => setOnboardingParentEmail(e.target.value)} placeholder="Required for parent access" required style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                        <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Parent Login Password</label><input name="parentPassword" type="password" value={onboardingParentPassword} onChange={e => setOnboardingParentPassword(e.target.value)} placeholder="Required" required style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                        <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Kids Sports</label><input name="sports" placeholder="e.g. Swimming, Football" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                        <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Authorized Pick-ups</label><input name="authorizedPickups" placeholder="Names & Phone Numbers" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                        <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Allergies</label><input name="allergies" placeholder="e.g. Peanuts" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: "var(--radius-sm)" }} /></div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Completed Vaccines (Based on Age)</label>
                          {(() => {
                            let ageInWeeks = 0;
                            if (onboardingBirthday) {
                              const ms = Date.now() - new Date(onboardingBirthday).getTime();
                              ageInWeeks = ms / (1000 * 60 * 60 * 24 * 7);
                            } else if (onboardingAgeYears) {
                              ageInWeeks = parseFloat(onboardingAgeYears) * 52;
                            }
                            const expectedVaccines = UNEPI_SCHEDULE.filter(v => v.ageWeeks <= ageInWeeks);
                            return (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, background: 'var(--bg-default)', padding: 12, borderRadius: "var(--radius-sm)", border: '1px solid var(--border-default)' }}>
                                {expectedVaccines.map(v => (
                                  <label key={v.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={onboardingVaccines.includes(v.name)}
                                      onChange={(e) => {
                                        if (e.target.checked) setOnboardingVaccines([...onboardingVaccines, v.name]);
                                        else setOnboardingVaccines(onboardingVaccines.filter(name => name !== v.name));
                                      }}
                                    />
                                    {v.name}
                                  </label>
                                ))}
                                {expectedVaccines.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Please enter Age or Birthday to see expected vaccines.</span>}
                              </div>
                            );
                          })()}
                          <input type="hidden" name="completedVaccines" value={onboardingVaccines.join(', ')} />
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={async () => {
                          try {
                            const formElement = document.getElementById('onboardingForm');
                            if (!formElement) return;
                            const fd = new FormData(formElement);
                            
                            if (!onboardingParentEmail || !onboardingParentPassword) {
                              alert("Please enter a Parent Login Email and Password to complete onboarding.");
                              return;
                            }

                            const newChild = {
                              id: 'child-new-' + Date.now(),
                              name: fd.get('name') || 'Unnamed Child', 
                              age: (fd.get('age') || '0') + ' yrs',
                              parent: fd.get('parent') || 'Unknown', 
                              secondaryParent: fd.get('secondaryParent') || 'N/A',
                              parentPhone: '256700000000',
                              authorizedPickups: fd.get('authorizedPickups') || 'Parents Only',
                              sports: fd.get('sports') || 'None',
                              mood: '😊', present: true, nap: false, milestone: '',
                              invoiceStatus: 'due', healthRecord: 'No current concerns.',
                              allergies: fd.get('allergies') || 'None',
                              completedVaccines: (fd.get('completedVaccines') || '').split(',').map(s => s.trim()),
                              favouriteMeals: 'To be determined', 
                              birthday: fd.get('birthday') || new Date().toISOString().split('T')[0],
                              height: '-', weight: '-', activeScore: 90, enrollmentDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                              photoUrl: fd.get('photoUrl') || 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
                              carePlan: fd.get('carePlan') || 'monthly',
                              paymentMethod: fd.get('paymentMethod') || 'mobile_money'
                            };

                            // Create Parent Auth Account in Supabase using a temporary client to prevent logging the manager out
                            if (supabase) {
                              const tempSupabase = window.supabase.createClient(
                                supabaseUrl, 
                                supabaseKey, 
                                { auth: { storage: { getItem: () => null, setItem: () => null, removeItem: () => null } } }
                              );

                              const { error: signUpError } = await tempSupabase.auth.signUp({
                                email: onboardingParentEmail,
                                password: onboardingParentPassword,
                                options: {
                                  data: {
                                    role: 'parent',
                                    full_name: newChild.parent,
                                    childId: newChild.id
                                  }
                                }
                              });
                              if (signUpError) {
                                console.error("Supabase Auth Error:", signUpError);
                                alert("Failed to create parent login: " + signUpError.message);
                                return;
                              }
                            }

                            setCentersData(prev => {
                              const targetId = selectedCenterId === 'all' ? prev[0].id : selectedCenterId;
                              return prev.map(c => c.id === targetId ? { ...c, children: [newChild, ...(c.children || [])] } : c);
                            });
                            try {
                              const existingLocal = JSON.parse(localStorage.getItem('localNewChildren') || '[]');
                              localStorage.setItem('localNewChildren', JSON.stringify([newChild, ...existingLocal]));
                            } catch (e) {}
                            setOnboardingReport(newChild);
                          } catch (err) {
                            console.error("Error submitting onboarding:", err);
                            alert("Something went wrong processing the form. Please try again.");
                          }
                        }} 
                        style={{ width: '100%', background: 'var(--mint)', color: 'var(--bg-deepest)', border: 'none', borderRadius: "var(--radius-sm)", padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', marginTop: 8 }}
                      >
                        Complete Onboarding
                      </button>
                    </form>
                  </React.Fragment>
              ) : (
                <React.Fragment>
                  <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', color: 'var(--mint)', fontFamily: 'var(--font-display)' }}>Onboarding Complete! 🎉</h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>{onboardingReport.name} has been successfully added to the system.</p>
                  
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 24, marginBottom: 24 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ background: 'var(--bg-deepest)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 16 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontWeight: 700 }}>Pickup QR Card</div>
                        <div style={{ display: 'flex', justifyContent: 'center', background: '#fff', padding: 16, borderRadius: "var(--radius-sm)", marginBottom: 12 }}>
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${onboardingReport.id}`} alt="QR Code" style={{ width: 150, height: 150 }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>Scan at gate for authorized pickup</div>
                      </div>
                    </div>
                    
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ background: 'var(--bg-deepest)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 16 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontWeight: 700 }}>Intake Summary</div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                          <div><span style={{ color: 'var(--text-tertiary)' }}>Parents:</span> <span style={{ color: '#fff' }}>{onboardingReport.parent}, {onboardingReport.secondaryParent}</span></div>
                          <div><span style={{ color: 'var(--text-tertiary)' }}>Auth Pickups:</span> <span style={{ color: '#fff' }}>{onboardingReport.authorizedPickups}</span></div>
                          <div><span style={{ color: 'var(--text-tertiary)' }}>Allergies:</span> <span style={{ color: 'var(--danger)' }}>{onboardingReport.allergies}</span></div>
                          <div><span style={{ color: 'var(--text-tertiary)' }}>Care Plan:</span> <span style={{ color: '#fff', textTransform: 'capitalize' }}>{onboardingReport.carePlan}</span></div>
                          <div><span style={{ color: 'var(--text-tertiary)' }}>Birthday:</span> <span style={{ color: '#fff' }}>{onboardingReport.birthday}</span></div>
                          <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-tertiary)' }}>Payment Method:</span> <span style={{ color: '#fff' }}>{onboardingReport.paymentMethod === 'mobile_money' ? '📱 Mobile Money' : '💳 Card Payment'}</span></div>
                          <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-tertiary)' }}>Vaccines:</span> <span style={{ color: '#fff' }}>{onboardingReport.completedVaccines.join(', ')}</span></div>
                        </div>
                      </div>
                      
                      <div style={{ background: 'var(--bg-deepest)', border: '1px solid var(--border-subtle)', borderRadius: "var(--radius-md)", padding: 16 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 700 }}>Parent Portal Link</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input readOnly value={`https://amani.app/parent/${onboardingReport.id}`} style={{ flex: 1, background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: 6, fontSize: 12 }} />
                          <button onClick={() => alert('Link Copied!')} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Copy</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => window.print()} style={{ flex: 1, background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: "var(--radius-sm)", padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>🖨️ Print Report</button>
                    <button onClick={() => { setOnboardingOpen(false); setOnboardingReport(null); }} style={{ flex: 1, background: 'var(--mint)', color: 'var(--bg-deepest)', border: 'none', borderRadius: "var(--radius-sm)", padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Done</button>
                  </div>
                </React.Fragment>
              )}
            </div>
          </div>
        )}

        {/* QR Scanner Modal */}
        {qrScannerOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ background: 'var(--bg-elevated)', width: 400, borderRadius: "var(--radius-lg)", border: '1px solid var(--border-subtle)', padding: 32, position: 'relative', textAlign: 'center' }}>
              <button onClick={() => { setQrScannerOpen(false); setScannedChildId(null); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 20 }}>×</button>
              
              {!scannedChildId ? (
                <React.Fragment>
                  <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 16px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Scan Parent QR</h2>
                  <div style={{ width: '100%', height: 250, background: '#111', borderRadius: "var(--radius-md)", marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-default)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', width: 200, height: 200, border: '2px solid rgba(0, 252, 143, 0.5)', borderRadius: "var(--radius-lg)" }}></div>
                    <div style={{ width: '100%', height: 2, background: 'var(--mint)', position: 'absolute', top: '50%', boxShadow: '0 0 10px var(--mint)', animation: 'scanline 2s infinite' }}></div>
                    <style>{`
                      @keyframes scanline {
                        0% { top: 0; opacity: 0; }
                        10% { opacity: 1; }
                        90% { opacity: 1; }
                        100% { top: 100%; opacity: 0; }
                      }
                    `}</style>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Simulating scan... Select a child to test.</p>
                  <select onChange={(e) => setScannedChildId(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: "var(--radius-sm)", background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', outline: 'none' }}>
                    <option value="">-- Select Child QR --</option>
                    {childrenData.filter(c => c.present).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0, 252, 143, 0.2)', color: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>✓</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', color: 'var(--mint)', fontFamily: 'var(--font-display)' }}>Authorized Match</h2>
                  
                  {(() => {
                    const c = childrenData.find(x => x.id === scannedChildId);
                    if (!c) return null;
                    return (
                      <div style={{ background: 'var(--bg-deepest)', borderRadius: "var(--radius-md)", padding: 16, marginTop: 16, textAlign: 'left', border: '1px solid var(--mint)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <img src={c.photoUrl} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Status: {c.present ? 'Present' : 'Absent'}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: 16 }}>
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: "var(--radius-sm)" }}>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Time Arrived</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--mint)' }}>07:30 AM</div>
                          </div>
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: "var(--radius-sm)" }}>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Time Leaving</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--mint)' }}>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}><strong style={{ color: 'var(--text-primary)' }}>Primary Parent:</strong> {c.parent}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: c.carePlan !== 'monthly' ? 8 : 16 }}><strong style={{ color: 'var(--text-primary)' }}>Authorized Pickups:</strong> {c.authorizedPickups || 'Parents only'}</div>
                        {c.carePlan !== 'monthly' && (
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                            <strong style={{ color: 'var(--text-primary)' }}>Payment Status:</strong>{' '}
                            <span style={{ 
                              color: c.invoiceStatus === 'paid' ? 'var(--mint)' : c.invoiceStatus === 'due' ? 'var(--gold)' : 'var(--danger)',
                              fontWeight: 700, textTransform: 'uppercase'
                            }}>
                              {c.invoiceStatus}
                            </span>
                          </div>
                        )}
                        
                        <button onClick={() => { handleSignOut(c); setQrScannerOpen(false); setScannedChildId(null); }} style={{ width: '100%', padding: 12, borderRadius: "var(--radius-sm)", border: 'none', background: 'var(--mint)', color: 'var(--text-inverse)', fontWeight: 700, cursor: 'pointer' }}>Confirm & Sign Out</button>
                      </div>
                    );
                  })()}
                </React.Fragment>
              )}
            </div>
          </div>
        )}

        </div>{/* End Main Content Area */}
      </div>
    );
  };

  window.ChildcareOSPage = ChildcareOSPage;
})();
