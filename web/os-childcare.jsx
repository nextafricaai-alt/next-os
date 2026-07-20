/* os-childcare.jsx — Charis Childcare OS Panel
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
      ],
      schedule: [
        { time: '07:30', activity: 'Arrival & Free Play',               caretaker: 'Ms. Maria L.',   icon: '🌅', color: '#00FC8F' },
        { time: '09:00', activity: 'Morning Circle & Songs',            caretaker: 'Ms. Maria L.',   icon: '🎵', color: '#A855F7' },
        { time: '09:30', activity: 'Structured Learning — Letters',     caretaker: 'Ms. Faith A.',   icon: '📚', color: '#3B82F6' },
        { time: '10:30', activity: 'Snack Time',                        caretaker: 'All caretakers', icon: '🍎', color: '#FFB400' },
        { time: '11:00', activity: 'Creative Arts & Craft',             caretaker: 'Ms. Ruth K.',    icon: '🎨', color: '#F43F5E' },
        { time: '12:00', activity: 'Lunch',                             caretaker: 'All caretakers', icon: '🍽️', color: '#10B981' },
        { time: '12:45', activity: 'Nap Time',                          caretaker: 'Ms. Maria L.',   icon: '😴', color: '#6366F1' },
        { time: '14:00', activity: 'Outdoor Play & Story Time',         caretaker: 'Ms. Faith A.',   icon: '🌳', color: '#00FC8F' },
        { time: '15:00', activity: 'Parent Pick-up Window',             caretaker: 'All caretakers', icon: '🚗', color: '#FFB400' },
      ],
      messages: [
        { id: 1, parent: 'Mrs. Nakamya',  time: '8:42 AM',  text: 'Will pick up Aiden at 2pm today, please note.',          read: false, answered: false },
        { id: 2, parent: 'Ms. Okello',    time: '9:15 AM',  text: 'Bella is feeling better, thanks for yesterday\'s care!', read: true,  answered: true  },
        { id: 3, parent: 'Mr. Ssemanda',  time: '9:50 AM',  text: 'Can you share today\'s activity photos on WhatsApp?',    read: false, answered: false },
        { id: 4, parent: 'Mrs. Mutebe',   time: '10:20 AM', text: 'Daisy is home sick today, she has a mild fever.',        read: true,  answered: true  },
        { id: 5, parent: 'Mr. Lubega',    time: '11:05 AM', text: 'Please give Ethan his medication at 1pm. Thanks.',       read: false, answered: false },
      ],
      cameras: [
        { id: 'cam1', mjpegUrl: 'http://[USERNAME]:[PASSWORD]@192.168.100.18/Streaming/channels/102/httppreview', name: 'Playroom A - North View', source: 'camera_mock_1', children: [{ name: 'Ivy Kyomuhendo', milestone: 'Puzzle (12 pieces)', x: 60, y: 40 }, { name: 'Aiden Nakamya', milestone: 'First full sentence', x: 20, y: 70 }] },
        { id: 'cam2', mjpegUrl: 'http://[USERNAME]:[PASSWORD]@192.168.100.18/Streaming/channels/202/httppreview', name: 'Nap Area - East Wing', source: 'camera_mock_2', children: [{ name: 'Henry Kato', milestone: 'Sleeping calmly', x: 40, y: 50 }] },
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
        { time: '08:00', activity: 'Arrival & Free Play',               caretaker: 'Mr. Opiyo',   icon: '🌅', color: '#00FC8F' },
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




  // ── Helper: current time highlight for schedule ──────────────────────────
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
      borderRadius: 12, padding: '20px 22px', flex: 1, minWidth: 140,
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
    const statusColor = child.present ? '#00FC8F' : '#FF4757';
    const invoiceColor = child.invoiceStatus === 'overdue' ? '#FF4757' : child.invoiceStatus === 'due' ? '#FFB400' : '#00FC8F';
    return (
      <div onClick={() => onSelect(child)} style={{
        background: 'var(--bg-elevated)', border: `1px solid ${child.present ? 'var(--border-subtle)' : 'rgba(255,71,87,0.2)'}`,
        borderRadius: 12, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10,
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
            <div style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: 4, display: 'inline-block', marginTop: 4, color: 'var(--text-secondary)' }}>
              {child.carePlan === 'monthly' ? '📅 Monthly' : '🗓️ Daily'}
            </div>
          </div>
        </div>
        {child.milestone && (
          <div style={{ background: 'rgba(0,252,143,0.06)', border: '1px solid rgba(0,252,143,0.15)', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: 'var(--mint)' }}>
            🏆 Milestone: {child.milestone}
          </div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onMessage(child); }} style={{
          background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 8,
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
          const systemPrompt = `You are Nia, the AI Chief of Staff for Charis Childcare. You are analyzing a child's profile to assist the childcare staff.
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
      <div style={{ background: 'var(--bg-deepest)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: 'var(--mint)' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #00FC8F, #1B9B6F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🛡️</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--mint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nia's Assessment</div>
        </div>
        
        {loading ? (
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite opacity' }}>●</span> Analyzing profile data...
          </div>
        ) : error ? (
          <div style={{ fontSize: 14, color: '#FF4757' }}>Unable to load Nia's assessment: {error}</div>
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
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)' }}>
          <span>←</span> Back to Roster
        </button>
        
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '32px 40px', display: 'flex', gap: 40 }}>
          {/* Left Column: Photo & Base Info */}
          <div style={{ width: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: 140, height: 140, borderRadius: '50%', background: `url(${child.photoUrl}) center/cover`, border: `4px solid ${child.present ? 'var(--mint)' : 'var(--border-default)'}`, marginBottom: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}></div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{child.name}</h2>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>{child.age} Years Old</div>
            
            <div style={{ background: 'var(--bg-deep)', borderRadius: 12, padding: '12px', width: '100%', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Parent / Guardian</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{child.parent}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{child.parentPhone}</div>
            </div>
            
            <button onClick={() => onMessage(child)} style={{ background: 'var(--mint)', color: '#060012', border: 'none', borderRadius: 8, padding: '12px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', fontFamily: 'var(--font-body)' }}>
              Message Parent
            </button>
          </div>
          
          {/* Right Column: Detailed Vitals & Health */}
          <div style={{ flex: 1 }}>
            <NiaProfileBrief child={child} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, marginBottom: 20, marginTop: 0 }}>Vital Information</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div style={{ background: child.allergies !== 'None' ? 'rgba(255,71,87,0.05)' : 'var(--bg-deep)', border: child.allergies !== 'None' ? '1px solid rgba(255,71,87,0.2)' : '1px solid var(--border-subtle)', borderRadius: 10, padding: '16px' }}>
                <div style={{ fontSize: 12, color: child.allergies !== 'None' ? '#FF4757' : 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 600 }}>Allergies</div>
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
                        <div style={{ background: vac.progress === 100 ? 'var(--mint)' : '#A855F7', width: vac.progress + '%', height: '100%' }}></div>
                      </div>
                      {vac.due.length > 0 && (
                        <div style={{ background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.3)', borderRadius: 6, padding: '8px 10px', marginTop: 8 }}>
                          <span style={{ fontSize: 11, color: '#FFB400', fontWeight: 600, display: 'block', marginBottom: 2 }}>⚠️ Overdue Vaccines</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{vac.due.join(', ')}</span>
                        </div>
                      )}
                      {vac.upcoming.length > 0 && (
                        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 6, padding: '8px 10px', marginTop: 8 }}>
                          <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 600, display: 'block', marginBottom: 2 }}>⏳ Upcoming (Next 4 Weeks)</span>
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
            
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, marginBottom: 20, marginTop: 24 }}>Health Record & Notes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--bg-deep)', padding: 16, borderRadius: 10 }}>
                {child.healthRecord}
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
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
  const NiaAdvisoryBanner = ({ onTalkToNia }) => (
    <div style={{
      background: 'linear-gradient(135deg, rgba(0,252,143,0.06) 0%, rgba(0,252,143,0.02) 100%)',
      border: '1px solid rgba(0,252,143,0.2)', borderRadius: 12, padding: '16px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      marginBottom: 28,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #00FC8F, #1B9B6F)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, boxShadow: '0 0 16px rgba(0,252,143,0.3)',
        }}>🛡️</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mint)' }}>Nia is watching Childcare OS</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            2 parent messages unanswered · Nakamya invoice 30+ days overdue · 3 children absent today
          </div>
        </div>
      </div>
      <button onClick={onTalkToNia} style={{
        background: 'var(--mint)', color: '#060012', border: 'none', borderRadius: 8,
        padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        whiteSpace: 'nowrap', fontFamily: 'var(--font-body)',
      }}>Talk to Nia →</button>
    </div>
  );

  // ── Nia AI Chat Overlay ──────────────────────────────────────────────────
  const ChildcareNiaOverlay = ({ isOpen, onClose, contextData }) => {
    const [messages, setMessages] = React.useState([{ role: 'assistant', content: 'Hello Hudson. I am monitoring Charis Childcare OS. What do you need to know?' }]);
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

      const systemPrompt = `You are Nia, the AI Chief of Staff for NEXT OS. You are currently viewing the Charis Childcare OS dashboard for Hudson Tumusiime (Global Director).
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
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #00FC8F, #1B9B6F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
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
              <div style={{ background: m.role === 'user' ? 'var(--mint)' : 'var(--bg-surface)', color: m.role === 'user' ? '#060012' : 'var(--text-primary)', padding: '10px 14px', borderRadius: 12, borderBottomRightRadius: m.role === 'user' ? 2 : 12, borderBottomLeftRadius: m.role === 'user' ? 12 : 2, fontSize: 13, lineHeight: 1.5 }}>
                {m.content}
              </div>
            </div>
          ))}
          {pending && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 12, fontSize: 13, color: 'var(--text-tertiary)' }}>
              Nia is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div style={{ padding: 20, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask Nia about the dashboard..." style={{ flex: 1, background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
            <button onClick={handleSend} disabled={pending || !input.trim()} style={{ background: 'var(--mint)', color: '#060012', border: 'none', borderRadius: 8, padding: '0 16px', fontWeight: 700, cursor: (pending || !input.trim()) ? 'not-allowed' : 'pointer', opacity: (pending || !input.trim()) ? 0.5 : 1 }}>Send</button>
          </div>
        </div>
      </div>
    );
  };

  
  const INITIAL_GLOBAL_MESSAGES = [
    { id: 101, fromRole: 'parent', fromName: 'Mrs. Nakamya', toRole: 'manager', branchId: 'charis-kampala', text: 'Aiden will be late today.', time: '8:00 AM' },
    { id: 102, fromRole: 'investor', fromName: 'Investor Group', toRole: 'director', branchId: null, text: 'When is the next quarterly report?', time: '9:00 AM' },
    { id: 103, fromRole: 'parent', fromName: 'Ms. Okello', toRole: 'manager', branchId: 'charis-kampala', text: 'Bella is feeling better, thanks!', time: '9:15 AM' },
  ];

  // ── Parent App Component ──────────────────────────────────────────────────
  const ParentApp = ({ user, childrenData, onLogout, globalMessages, setGlobalMessages }) => {
    const child = childrenData.find(c => c.id === user.childId);
    const [activeTab, setActiveTab] = React.useState('home');
    const [msgText, setMsgText] = React.useState('');

    const myMessages = globalMessages.filter(m => 
      (m.fromRole === 'parent' && m.fromName === user.name) || 
      (m.toRole === 'parent' && m.toName === user.name)
    );

    if (!child) return <div>Child not found</div>;

    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', background: '#000', fontFamily: 'var(--font-body)' }}>
        <div style={{ width: '100%', maxWidth: 414, background: 'var(--bg-default)', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Charis Parent</div>
            <button onClick={onLogout} style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>Logout</button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {activeTab === 'home' && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <img src={child.photoUrl} style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid var(--mint)', marginBottom: 10 }} />
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{child.name}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Status: {child.present ? 'Present' : 'Absent'} {child.nap ? ' (Napping)' : ''}</div>
                </div>
                
                <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 12, marginBottom: 16, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8, letterSpacing: '0.05em' }}>Daily Update</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Mood: {child.mood}</div>
                  {child.milestone && <div style={{ fontSize: 14, color: 'var(--mint)', marginTop: 8 }}>🏆 Milestone: {child.milestone}</div>}
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8, letterSpacing: '0.05em' }}>Recent Activity</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Ate Lunch: Mac & Cheese</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Participated in Art Class</div>
                </div>
              </div>
            )}

            {activeTab === 'messages' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
                  {myMessages.length === 0 ? <div style={{ color: 'var(--text-tertiary)' }}>No messages yet.</div> : null}
                  {myMessages.map(m => (
                    <div key={m.id} style={{ 
                      marginBottom: 10, padding: 10, borderRadius: 8, 
                      background: m.fromRole === 'parent' ? 'rgba(0, 252, 143, 0.1)' : 'var(--bg-elevated)',
                      border: m.fromRole === 'parent' ? '1px solid rgba(0, 252, 143, 0.2)' : '1px solid var(--border-subtle)',
                      alignSelf: m.fromRole === 'parent' ? 'flex-end' : 'flex-start'
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{m.fromName} • {m.time}</div>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{m.text}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Message the Manager..." style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px', borderRadius: 8 }} />
                  <button onClick={() => {
                    if(!msgText.trim()) return;
                    setGlobalMessages([...globalMessages, { id: Date.now(), fromRole: 'parent', fromName: user.name, toRole: 'manager', branchId: 'charis-kampala', text: msgText, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
                    setMsgText('');
                  }} style={{ background: 'var(--mint)', color: '#000', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Send</button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Nav */}
          <div style={{ display: 'flex', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', padding: '10px 0', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}>
            <div onClick={() => setActiveTab('home')} style={{ flex: 1, textAlign: 'center', color: activeTab === 'home' ? 'var(--mint)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 20 }}>🏠<div style={{ fontSize: 10, marginTop: 4 }}>Home</div></div>
            <div onClick={() => setActiveTab('messages')} style={{ flex: 1, textAlign: 'center', color: activeTab === 'messages' ? 'var(--mint)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 20 }}>💬<div style={{ fontSize: 10, marginTop: 4 }}>Messages</div></div>
          </div>
        </div>
      </div>
    );
  };

// ── Main Page Component ──────────────────────────────────────────────────
  const ChildcareOSPage = ({ onNavigate }) => {
    
    const [currentUser, setCurrentUser] = React.useState(null);
    const [globalMessages, setGlobalMessages] = React.useState(INITIAL_GLOBAL_MESSAGES);

    const [activeTab, setActiveTab] = React.useState('overview');
    const [selectedCenterId, setSelectedCenterId] = React.useState('all');
    const [selectedChild, setSelectedChild] = React.useState(null);
    const [niaOpen, setNiaOpen] = React.useState(false);
    const [centersData, setCentersData] = React.useState(CENTERS);
    const [onboardingOpen, setOnboardingOpen] = React.useState(false);
    const [onboardingReport, setOnboardingReport] = React.useState(null);

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
        'Hello ' + child.parent + ', this is a message from the Charis Childcare team regarding ' + child.name + '. '
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    if (!currentUser) {
      return (
        <div style={{ width: '100%', height: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deepest)', fontFamily: 'var(--font-body)' }}>
          <div style={{ background: 'var(--bg-default)', padding: 40, borderRadius: 16, border: '1px solid var(--border-subtle)', width: 400, textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 8 }}>Charis Childcare</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Select your role to continue</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => setCurrentUser({ role: 'director', name: 'Global Director' })} style={{ padding: 14, background: 'var(--mint)', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Login as Global Director</button>
              <button onClick={() => { setCurrentUser({ role: 'manager', name: 'Branch Manager', branchId: 'charis-kampala' }); setSelectedCenterId('charis-kampala'); }} style={{ padding: 14, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Login as Branch Manager (Kampala)</button>
              <button onClick={() => setCurrentUser({ role: 'parent', name: 'Mrs. Nakamya', childId: 1 })} style={{ padding: 14, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Login as Parent (Mrs. Nakamya)</button>
              <button onClick={() => setCurrentUser({ role: 'investor', name: 'Investor Group' })} style={{ padding: 14, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Login as Investor</button>
            </div>
          </div>
        </div>
      );
    }

    if (currentUser.role === 'parent') {
      return <ParentApp user={currentUser} childrenData={childrenData} onLogout={() => setCurrentUser(null)} globalMessages={globalMessages} setGlobalMessages={setGlobalMessages} />;
    }

    const tabs = [
      { id: 'overview',  label: 'Overview', icon: '📊', roles: ['director', 'manager', 'investor'] },
      { id: 'children',  label: 'Children', icon: '🧒', roles: ['director', 'manager'] },
      { id: 'schedule',  label: 'Schedule', icon: '🗓️', roles: ['director', 'manager'] },
      { id: 'messages',  label: 'Messages', icon: '💬', badge: kpi.unreadParentMessages, roles: ['director', 'manager', 'investor'] },
      { id: 'invoices',  label: selectedCenterId === 'all' ? 'Finances' : 'Invoices', icon: '💳', roles: ['director', 'manager', 'investor'] },
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
          position: 'fixed', top: 0, bottom: 0, left: 0, overflowY: 'auto', zIndex: 50
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingLeft: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #FFB400, #FF8C00)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, boxShadow: '0 4px 20px rgba(255,180,0,0.3)', flexShrink: 0
            }}>👶</div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                Charis OS
              </h1>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 2, textTransform: 'uppercase' }}>
                {currentUser.role}
              </div>
              <button onClick={() => setCurrentUser(null)} style={{ marginTop: 8, padding: '4px 8px', background: 'var(--bg-deepest)', border: 'none', color: 'var(--text-secondary)', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>LOGOUT</button>
            </div>
          </div>

          {/* Center Selector */}
          {currentUser.role === 'director' && (
            <div style={{ marginBottom: 30, paddingLeft: 8, paddingRight: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Facility</div>
              <select 
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
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
                background: activeTab === tab.id ? 'rgba(0,252,143,0.08)' : 'transparent',
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
                  <span style={{ background: '#A855F7', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button onClick={() => setNiaOpen(true)} style={{
            background: 'linear-gradient(135deg, rgba(0,252,143,0.1), rgba(0,252,143,0.02))',
            border: '1px solid rgba(0,252,143,0.2)', borderRadius: 12, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 12, marginTop: 40, cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'left'
          }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #00FC8F, #1B9B6F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--mint)' }}>Talk to Nia</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>AI Chief of Staff</div>
            </div>
          </button>
        </div>

        {/* ── MAIN CONTENT AREA ── */}
        <div style={{ flex: 1, padding: '40px 60px', marginLeft: 260, maxWidth: 1200 }}>
          {/* Top Bar inside content */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--mint)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {tabs.find(t => t.id === activeTab) ? tabs.find(t => t.id === activeTab).label : ''}
              </h2>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Welcome back, Hudson Tumusiime
            </div>
          </div>

        {/* Nia Banner */}
        <NiaAdvisoryBanner onTalkToNia={() => setNiaOpen(true)} />

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <React.Fragment>
            {/* KPI Strip */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
              <CcKpiCard label="Enrolled" value={kpi.enrolled} sub="July cohort" accent="#00FC8F" icon="🧒" />
              <CcKpiCard label="Present Today" value={kpi.presentToday} sub={`${kpi.absentToday} absent`} accent="#3B82F6" icon="✅" />
              <CcKpiCard label="Attendance" value={Math.round(kpi.attendanceRate * 100) + '%'} sub="Target: 90%+" accent={kpi.attendanceRate >= 0.9 ? '#00FC8F' : '#FFB400'} icon="📊" />
              {selectedCenterId === 'all' ? (
                <CcKpiCard label="Staff Payments" value={'UGX ' + ((kpi.caretakers || 0) * 800000).toLocaleString()} sub={`${kpi.caretakers || 0} active staff`} accent="#FF4757" icon="💳" />
              ) : (
                <CcKpiCard label="Invoices Due" value={kpi.invoicesDue} sub={kpi.invoicesOverdue30d + ' overdue 30d+'} accent="#FF4757" icon="💳" />
              )}
              <CcKpiCard label="Messages" value={kpi.unreadParentMessages} sub={kpi.unansweredMessages24h + ' need reply'} accent="#A855F7" icon="💬" />
              <CcKpiCard label="Milestones" value={kpi.milestonesThisWeek} sub="This week" accent="#FFB400" icon="🏆" />
            </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Today's Pulse */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Today's Pulse</div>
              {[
                { label: 'Present', val: kpi.presentToday, total: kpi.enrolled, color: '#00FC8F' },
                { label: 'Fee Collection', val: Math.round(kpi.collectionRate * 100), total: 100, color: '#3B82F6', pct: true },
                { label: 'Attendance Rate', val: Math.round(kpi.attendanceRate * 100), total: 100, color: '#FFB400', pct: true },
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
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Today's Schedule</div>
              {TODAY_SCHEDULE.slice(0, 5).map((slot, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px',
                  borderRadius: 8, marginBottom: 4,
                  background: i === currentSlot ? 'rgba(0,252,143,0.08)' : 'transparent',
                  border: i === currentSlot ? '1px solid rgba(0,252,143,0.2)' : '1px solid transparent',
                }}>
                  <span style={{ fontSize: 16 }}>{slot.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: i === currentSlot ? 'var(--mint)' : 'var(--text-secondary)', fontWeight: i === currentSlot ? 600 : 400 }}>{slot.activity}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{slot.caretaker}</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{slot.time}</div>
                </div>
              ))}
              <button onClick={() => setActiveTab('schedule')} style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', width: '100%', marginTop: 8, fontFamily: 'var(--font-body)' }}>
                View full schedule →
              </button>
            </div>

            {/* Immunisation Alerts */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: '#FFB400', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>⚠️ Immunisation Alerts</div>
              {(() => {
                const alerts = childrenData.map(c => ({ child: c, vac: calculateVaccineStatus(c) }))
                  .filter(item => item.vac.due.length > 0)
                  .slice(0, 5);
                if (alerts.length === 0) return <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>All children are up to date!</div>;
                return alerts.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF4757' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.child.name}</div>
                      <div style={{ fontSize: 11, color: '#FFB400' }}>Overdue: {item.vac.due.join(', ')}</div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Recent Milestones */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 }}>
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
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Quick Actions</div>
              {[
                { label: '📣 Broadcast to All Parents', action: () => { const url = 'https://wa.me/?text=' + encodeURIComponent('Hello from Charis Childcare! '); window.open(url, '_blank'); } },
                { label: '💬 View Messages', action: () => setActiveTab('messages') },
                { label: selectedCenterId === 'all' ? '📊 View Finances' : '📋 View Invoices', action: () => setActiveTab('invoices') },
                { label: '🛡️ Ask Nia for Advisory', action: () => setNiaOpen(true) },
              ].map(({ label, action }) => (
                <button key={label} onClick={action} style={{
                  display: 'block', width: '100%', background: 'transparent',
                  border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px',
                  fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left',
                  marginBottom: 8, transition: 'all 0.15s', fontFamily: 'var(--font-body)',
                }} className="quick-action-btn">{label}</button>
              ))}
            </div>
          </div>
          </React.Fragment>
        )}

        {/* ── CHILDREN TAB ── */}
        {activeTab === 'children' && !selectedChild && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
              <button onClick={() => setOnboardingOpen(true)} style={{ background: 'var(--mint)', color: '#060012', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>➕</span> Onboard Child
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {childrenData.map(child => <ChildCard key={child.id} child={child} onSelect={setSelectedChild} onMessage={handleMessage} />)}
            </div>
          </div>
        )}

        {activeTab === 'children' && selectedChild && (
           <ChildProfileView child={selectedChild} onBack={() => setSelectedChild(null)} onMessage={handleMessage} />
        )}

        {/* ── CAMERAS TAB ── */}
        {activeTab === 'cameras' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Live feeds from Charis Childcare center. AI Milestone tracking is currently active.</div>
              <button style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>⚙️ Configure Video Sources</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
              {CAMERAS.map(cam => (
                <div key={cam.id} style={{ background: 'var(--bg-elevated)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                  {/* Camera Header */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF4757', animation: 'pulse 2s infinite' }}></div>
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
                        <div style={{ border: '2px solid var(--mint)', width: 60, height: 80, borderRadius: 8, boxShadow: '0 0 10px rgba(0,252,143,0.3)', position: 'relative' }}>
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
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Today's Programme</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 24 }}>
              Generated by Global Director Hudson · {new Date().toDateString()}
            </div>
            {TODAY_SCHEDULE.map((slot, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 16px', borderRadius: 10, marginBottom: 8,
                background: i === currentSlot ? 'rgba(0,252,143,0.06)' : i < currentSlot ? 'rgba(255,255,255,0.02)' : 'transparent',
                border: i === currentSlot ? '1px solid rgba(0,252,143,0.25)' : '1px solid var(--border-subtle)',
                opacity: i < currentSlot ? 0.55 : 1,
                transition: 'all 0.2s',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: slot.color + '18', border: `1px solid ${slot.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                }}>{slot.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: i === currentSlot ? 600 : 400, color: i === currentSlot ? 'var(--mint)' : 'var(--text-primary)' }}>
                    {slot.activity}
                    {i === currentSlot && <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--mint)', color: '#060012', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>NOW</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Led by {slot.caretaker}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{slot.time}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── MESSAGES TAB ── */}
        {activeTab === 'messages' && (
          <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', gap: 20, height: 'calc(100vh - 150px)' }}>
            
            {/* Inbox List */}
            <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 10, borderRight: '1px solid var(--border-subtle)', paddingRight: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                {currentUser.role === 'investor' ? 'Director Comms' : 'Inbox'}
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {globalMessages
                  .filter(m => {
                    if (currentUser.role === 'investor') return m.fromRole === 'director' || m.toRole === 'investor' || m.fromRole === 'investor';
                    if (currentUser.role === 'manager') return (m.toRole === 'manager' && m.branchId === currentUser.branchId) || (m.fromRole === 'manager' && m.branchId === currentUser.branchId);
                    if (currentUser.role === 'director') return true; // Director sees everything
                    return false;
                  })
                  .map(msg => (
                    <div key={msg.id} style={{
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                      borderRadius: 12, padding: '14px', marginBottom: 10, cursor: 'pointer'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{msg.fromName} ({msg.fromRole})</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{msg.time}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{msg.text}</div>
                      <div style={{ fontSize: 10, color: 'var(--mint)', marginTop: 8, textTransform: 'uppercase' }}>To: {msg.toRole}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Message Composer */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-subtle)', padding: 20 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                Select a message to view thread, or compose a new one.
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <input placeholder="Type a message..." style={{ flex: 1, background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: 8 }} />
                <button style={{ background: 'var(--mint)', color: '#000', border: 'none', padding: '0 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Send</button>
              </div>
            </div>

          </div>
        )}

        {/* ── INVOICES / FINANCES TAB ── */}
        {activeTab === 'invoices' && (
          <React.Fragment>
            {selectedCenterId === 'all' ? (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden', padding: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Global Finances Overview — July 2026</div>
                
                {/* Revenue Breakdown */}
                {(() => {
                  const monthlyCount = childrenData.filter(c => c.carePlan === 'monthly').length;
                  const dailyCount = childrenData.filter(c => c.carePlan === 'daily').length;
                  const monthlyRevenue = monthlyCount * 87500;
                  const dailyRevenue = dailyCount * 15000;
                  const staffCost = (kpi.caretakers || 0) * 800000;
                  const inventoryCost = 2170000;
                  const utilitiesCost = 1200000;
                  const grossMargin = (monthlyRevenue + dailyRevenue) - (staffCost + inventoryCost + utilitiesCost);
                  
                  return (
                    <React.Fragment>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Revenue Stream</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                        <div style={{ background: 'var(--bg-deepest)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Monthly Care Plans</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#00FC8F' }}>UGX {monthlyRevenue.toLocaleString()}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Based on {monthlyCount} monthly kids</div>
                        </div>
                        <div style={{ background: 'var(--bg-deepest)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Daily Drop-ins</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#00FC8F' }}>UGX {dailyRevenue.toLocaleString()}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Based on {dailyCount} daily kids</div>
                        </div>
                      </div>

                      {/* Expenses Breakdown */}
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Expenditure</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                        <div style={{ background: 'var(--bg-deepest)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Staff Payment (Nannies/Workers)</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#FF4757' }}>UGX {staffCost.toLocaleString()}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Based on {kpi.caretakers || 0} active staff</div>
                        </div>
                        <div style={{ background: 'var(--bg-deepest)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Inventory / Toys</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#FF4757' }}>UGX {inventoryCost.toLocaleString()}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Purchases this month</div>
                        </div>
                        <div style={{ background: 'var(--bg-deepest)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Rent & Utilities</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#FF4757' }}>UGX {utilitiesCost.toLocaleString()}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Fixed monthly</div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Projected Gross Margin</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>UGX {grossMargin.toLocaleString()}</div>
                      </div>
                    </React.Fragment>
                  );
                })()}

                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Attendance Impact</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
                  Currently, <strong style={{ color: '#fff' }}>{kpi.presentToday}</strong> out of <strong style={{ color: '#fff' }}>{kpi.enrolled}</strong> students are present today across all centers ({(kpi.attendanceRate * 100).toFixed(1)}% attendance). Consistent attendance is key for reliable revenue collection. Outstanding invoices currently total <strong style={{ color: '#FF4757' }}>UGX {kpi.overdueAmount.toLocaleString()}</strong>.
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Invoice Register — July 2026</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    Collection: {Math.round(kpi.collectionRate * 100)}%
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {['Child', 'Parent', 'Amount (UGX)', 'Status', 'Action'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {childrenData.map(child => {
                      const statusColor = child.invoiceStatus === 'overdue' ? '#FF4757' : child.invoiceStatus === 'due' ? '#FFB400' : '#00FC8F';
                      const statusLabel = child.invoiceStatus === 'overdue' ? '⚠ OVERDUE 30d+' : child.invoiceStatus === 'due' ? '○ DUE' : '✓ PAID';
                      return (
                        <tr key={child.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="member-row">
                          <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{child.name}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{child.parent}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>87,500</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 11, color: statusColor, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{statusLabel}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {child.invoiceStatus !== 'paid' && (
                              <button onClick={() => handleMessage(child)} style={{
                                background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 6,
                                padding: '5px 10px', fontSize: 11, color: 'var(--mint)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                              }} className="quick-action-btn">Send reminder</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </React.Fragment>
        )}

        {/* ── INVENTORY TAB ── */}
        {activeTab === 'inventory' && selectedCenterId === 'all' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Global Inventory & Purchases</span>
                <button style={{ background: 'var(--mint)', color: '#060012', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Add Purchase</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-deepest)' }}>
                    {['Item', 'Category', 'Supplier / Store', 'Quantity', 'Cost (UGX)', 'Date'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { item: 'Giant Sandbox (2m x 2m)', category: 'Playground', supplier: 'Game Stores Kampala', qty: 1, cost: 450000, date: '2026-07-15' },
                    { item: 'Inflatable Mini Pool', category: 'Playground', supplier: 'Kikubo Importers', qty: 2, cost: 120000, date: '2026-07-12' },
                    { item: 'Montessori Wooden Toys Set', category: 'Toys', supplier: 'Aristoc Booklex', qty: 5, cost: 250000, date: '2026-07-10' },
                    { item: 'Play Mats (Interlocking foam)', category: 'Safety', supplier: 'Nina Interiors', qty: 20, cost: 300000, date: '2026-07-05' },
                    { item: 'Diapers (Pampers Size 4)', category: 'Consumables', supplier: 'Capital Shoppers', qty: 10, cost: 450000, date: '2026-07-02' },
                    { item: 'Posho (100kg)', category: 'Food', supplier: 'Nakawa Market', qty: 2, cost: 600000, date: '2026-07-01' },
                  ].map((inv, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>{inv.item}</td>
                      <td style={{ padding: '14px 16px' }}><span style={{ padding: '4px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', fontSize: 11, color: 'var(--text-secondary)' }}>{inv.category}</span></td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{inv.supplier}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>{inv.qty}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#FF4757' }}>{inv.cost.toLocaleString()}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-tertiary)' }}>{inv.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
            <div style={{ background: 'var(--bg-elevated)', width: onboardingReport ? 650 : 500, borderRadius: 16, border: '1px solid var(--border-subtle)', padding: 32, position: 'relative' }}>
              <button onClick={() => { setOnboardingOpen(false); setOnboardingReport(null); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 20 }}>×</button>
              
              {!onboardingReport ? (
                <React.Fragment>
                  <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 24px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Onboard New Child</h2>
                  <form onSubmit={e => {
                    e.preventDefault();
                    const fd = new FormData(e.target);
                    const newChild = {
                      id: 'child-new-' + Date.now(),
                      name: fd.get('name'), age: fd.get('age') + ' yrs',
                      parent: fd.get('parent'), secondaryParent: fd.get('secondaryParent') || 'N/A',
                      parentPhone: '256700000000',
                      authorizedPickups: fd.get('authorizedPickups') || 'Parents Only',
                      sports: fd.get('sports') || 'None',
                      mood: '😊', present: true, nap: false, milestone: '',
                      invoiceStatus: 'paid', healthRecord: 'No current concerns.',
                      allergies: fd.get('allergies') || 'None',
                      completedVaccines: (fd.get('completedVaccines') || '').split(',').map(s => s.trim()),
                      favouriteMeals: 'To be determined', birthday: fd.get('birthday') || 'TBD',
                      height: '-', weight: '-', activeScore: 90, enrollmentDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                      photoUrl: fd.get('photoUrl') || 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
                      carePlan: fd.get('carePlan') || 'monthly'
                    };
                    setChildrenData([newChild, ...childrenData]);
                    setOnboardingReport(newChild);
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Digital Passport Photo URL</label><input name="photoUrl" placeholder="https://..." style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8 }} /></div>
                      <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Full Name</label><input required name="name" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8 }} /></div>
                      <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Age (years)</label><input required name="age" type="number" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8 }} /></div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Care Plan</label>
                        <select name="carePlan" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8 }}>
                          <option value="monthly">Monthly Care (Everyday)</option>
                          <option value="daily">Daily Care (Drop-in)</option>
                        </select>
                      </div>
                      <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Birthday</label><input name="birthday" type="date" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8 }} /></div>
                      <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Primary Parent</label><input required name="parent" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8 }} /></div>
                      <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Secondary Parent</label><input name="secondaryParent" placeholder="Optional" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8 }} /></div>
                      <div><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Kids Sports</label><input name="sports" placeholder="e.g. Swimming, Football" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8 }} /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Authorized Pick-ups</label><input name="authorizedPickups" placeholder="Names & Phone Numbers" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8 }} /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Allergies</label><input name="allergies" placeholder="e.g. Peanuts" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8 }} /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>Completed Vaccines (comma separated)</label><input name="completedVaccines" defaultValue="BCG, Polio 0" style={{ width: '100%', background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 8 }} /></div>
                    </div>
                    <button type="submit" style={{ width: '100%', background: 'var(--mint)', color: '#060012', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', marginTop: 8 }}>Complete Onboarding</button>
                  </form>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', color: 'var(--mint)', fontFamily: 'var(--font-display)' }}>Onboarding Complete! 🎉</h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>{onboardingReport.name} has been successfully added to the system.</p>
                  
                  <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ background: 'var(--bg-deepest)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontWeight: 700 }}>Pickup QR Card</div>
                        <div style={{ display: 'flex', justifyContent: 'center', background: '#fff', padding: 16, borderRadius: 8, marginBottom: 12 }}>
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${onboardingReport.id}`} alt="QR Code" style={{ width: 150, height: 150 }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>Scan at gate for authorized pickup</div>
                      </div>
                    </div>
                    
                    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ background: 'var(--bg-deepest)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontWeight: 700 }}>Intake Summary</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                          <div><span style={{ color: 'var(--text-tertiary)' }}>Parents:</span> <span style={{ color: '#fff' }}>{onboardingReport.parent}, {onboardingReport.secondaryParent}</span></div>
                          <div><span style={{ color: 'var(--text-tertiary)' }}>Auth Pickups:</span> <span style={{ color: '#fff' }}>{onboardingReport.authorizedPickups}</span></div>
                          <div><span style={{ color: 'var(--text-tertiary)' }}>Allergies:</span> <span style={{ color: '#FF4757' }}>{onboardingReport.allergies}</span></div>
                          <div><span style={{ color: 'var(--text-tertiary)' }}>Care Plan:</span> <span style={{ color: '#fff', textTransform: 'capitalize' }}>{onboardingReport.carePlan}</span></div>
                          <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-tertiary)' }}>Vaccines:</span> <span style={{ color: '#fff' }}>{onboardingReport.completedVaccines.join(', ')}</span></div>
                        </div>
                      </div>
                      
                      <div style={{ background: 'var(--bg-deepest)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontWeight: 700 }}>Parent Portal Link</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input readOnly value={`https://charis.app/parent/${onboardingReport.id}`} style={{ flex: 1, background: 'var(--bg-default)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: 6, fontSize: 12 }} />
                          <button onClick={() => alert('Link Copied!')} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Copy</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => window.print()} style={{ flex: 1, background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>🖨️ Print Report</button>
                    <button onClick={() => { setOnboardingOpen(false); setOnboardingReport(null); }} style={{ flex: 1, background: 'var(--mint)', color: '#060012', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Done</button>
                  </div>
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
