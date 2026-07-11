import re

with open('web/os-childcare.jsx', 'r') as f:
    content = f.read()

centers_code = """
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
        { id: 1,  name: 'Aiden Nakamya',   age: 3, mood: '😊', present: true,  nap: false, milestone: 'First full sentence',   invoiceStatus: 'overdue',  parent: 'Mrs. Nakamya',   parentPhone: '256772001001', photoUrl: 'https://i.pravatar.cc/150?u=1', allergies: 'Peanuts', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)', 'Measles 2 / DPT Booster'], birthday: '2023-05-14', height: '95 cm', weight: '14.2 kg', activeScore: 850, favouriteMeals: 'Mac & Cheese', enrollmentDate: '2024-01-10', healthRecord: 'Asthma (mild). Uses inhaler when needed.' },
        { id: 2,  name: 'Bella Okello',    age: 2, mood: '😴', present: true,  nap: true,  milestone: 'Counting to 10',         invoiceStatus: 'paid',     parent: 'Ms. Okello',     parentPhone: '256772001002', photoUrl: 'https://i.pravatar.cc/150?u=2', allergies: 'None', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'DPT 3', 'Pneumococcal 3'], birthday: '2024-02-10', height: '88 cm', weight: '12.5 kg', activeScore: 620, favouriteMeals: 'Mashed Potatoes, Fish', enrollmentDate: '2025-03-01', healthRecord: 'No known chronic conditions. Prone to eczema.' },
        { id: 3,  name: 'Caleb Ssemanda',  age: 4, mood: '😄', present: true,  nap: false, milestone: 'Drawing shapes',         invoiceStatus: 'paid',     parent: 'Mr. Ssemanda',   parentPhone: '256772001003', photoUrl: 'https://i.pravatar.cc/150?u=3', allergies: 'Dairy (Lactose Intolerant)', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)', 'Measles 2 / DPT Booster'], birthday: '2022-11-05', height: '102 cm', weight: '16.0 kg', activeScore: 1120, favouriteMeals: 'Chicken Stew, Rice', enrollmentDate: '2023-09-15', healthRecord: 'Lactose intolerance requires soy/almond milk substitutes.' },
        { id: 4,  name: 'Daisy Mutebe',    age: 3, mood: '😢', present: false, nap: false, milestone: null,                     invoiceStatus: 'due',      parent: 'Mrs. Mutebe',    parentPhone: '256772001004', photoUrl: 'https://i.pravatar.cc/150?u=4', allergies: 'None', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)', 'Measles 2 / DPT Booster'], birthday: '2023-08-20', height: '92 cm', weight: '13.8 kg', activeScore: 780, favouriteMeals: 'Spaghetti, Bananas', enrollmentDate: '2024-05-20', healthRecord: 'Currently home sick with mild fever.' },
        { id: 5,  name: 'Ethan Lubega',    age: 2, mood: '😊', present: true,  nap: false, milestone: 'Walking stairs alone',   invoiceStatus: 'paid',     parent: 'Mr. Lubega',     parentPhone: '256772001005', photoUrl: 'https://i.pravatar.cc/150?u=5', allergies: 'Eggs', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever'], birthday: '2024-01-30', height: '86 cm', weight: '12.1 kg', activeScore: 590, favouriteMeals: 'Oatmeal, Apples', enrollmentDate: '2025-01-10', healthRecord: 'Egg allergy causes hives. EpiPen in nurse station.' },
        { id: 6,  name: 'Fiona Atim',      age: 4, mood: '😄', present: true,  nap: false, milestone: 'Reading own name',       invoiceStatus: 'paid',     parent: 'Ms. Atim',       parentPhone: '256772001006', photoUrl: 'https://i.pravatar.cc/150?u=6', allergies: 'None', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)', 'Measles 2 / DPT Booster'], birthday: '2022-12-12', height: '105 cm', weight: '17.5 kg', activeScore: 1250, favouriteMeals: 'Matooke and G-nut sauce', enrollmentDate: '2023-10-01', healthRecord: 'Perfect health record.' },
        { id: 7,  name: 'Grace Wamala',    age: 3, mood: '😊', present: true,  nap: true,  milestone: 'Sharing during play',    invoiceStatus: 'due',      parent: 'Mrs. Wamala',    parentPhone: '256772001007', photoUrl: 'https://i.pravatar.cc/150?u=7', allergies: 'None', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)'], birthday: '2023-04-18', height: '94 cm', weight: '14.0 kg', activeScore: 810, favouriteMeals: 'Rice, Beans', enrollmentDate: '2024-08-15', healthRecord: 'Minor hearing issue in left ear, under observation.' },
        { id: 8,  name: 'Henry Kato',      age: 2, mood: '😴', present: true,  nap: true,  milestone: null,                     invoiceStatus: 'paid',     parent: 'Mr. Kato',       parentPhone: '256772001008', photoUrl: 'https://i.pravatar.cc/150?u=8', allergies: 'None', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)'], birthday: '2024-03-05', height: '89 cm', weight: '13.2 kg', activeScore: 640, favouriteMeals: 'Yogurt, Toast', enrollmentDate: '2025-04-01', healthRecord: 'Generally healthy.' },
        { id: 9,  name: 'Ivy Kyomuhendo',  age: 4, mood: '😄', present: true,  nap: false, milestone: 'Puzzle (12 pieces)',     invoiceStatus: 'paid',     parent: 'Ms. Kyomuhendo', parentPhone: '256772001009', photoUrl: 'https://i.pravatar.cc/150?u=9', allergies: 'Dust', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)', 'Measles 2 / DPT Booster'], birthday: '2022-09-22', height: '108 cm', weight: '18.1 kg', activeScore: 1320, favouriteMeals: 'Chapati, Beef stew', enrollmentDate: '2023-08-01', healthRecord: 'Allergic to severe dust. Avoid dusty playground areas.' },
        { id: 10, name: 'Joel Byaruhanga', age: 3, mood: '😊', present: false, nap: false, milestone: null,                     invoiceStatus: 'paid',     parent: 'Mr. Byaruhanga', parentPhone: '256772001010', photoUrl: 'https://i.pravatar.cc/150?u=10', allergies: 'None', completedVaccines: ['BCG', 'Polio 0', 'Polio 1', 'DPT 1', 'Pneumococcal 1', 'Rotavirus 1', 'Polio 2', 'DPT 2', 'Pneumococcal 2', 'Rotavirus 2', 'Polio 3', 'DPT 3', 'Pneumococcal 3', 'Measles 1', 'Yellow Fever', 'MMR (Optional)', 'Varicella (Optional)', 'Measles 2 / DPT Booster'], birthday: '2023-07-11', height: '93 cm', weight: '14.5 kg', activeScore: 750, favouriteMeals: 'Pancakes, Mangoes', enrollmentDate: '2024-06-15', healthRecord: 'Recovering from minor cold.' },
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
        { id: 'cam1', wsPort: 9999, name: 'Playroom A - North View', source: 'camera_mock_1', children: [{ name: 'Ivy Kyomuhendo', milestone: 'Puzzle (12 pieces)', x: 60, y: 40 }, { name: 'Aiden Nakamya', milestone: 'First full sentence', x: 20, y: 70 }] },
        { id: 'cam2', wsPort: 9998, name: 'Nap Area - East Wing', source: 'camera_mock_2', children: [{ name: 'Henry Kato', milestone: 'Sleeping calmly', x: 40, y: 50 }] },
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
        { id: 11,  name: 'David Ocen',   age: 3, mood: '😊', present: true,  nap: false, milestone: 'First full sentence',   invoiceStatus: 'paid',  parent: 'Mr. Ocen',   parentPhone: '256772001020', photoUrl: 'https://i.pravatar.cc/150?u=11', allergies: 'None', completedVaccines: ['BCG', 'Polio 0'], birthday: '2023-01-14', height: '95 cm', weight: '14.2 kg', activeScore: 850, favouriteMeals: 'Posho', enrollmentDate: '2024-01-10', healthRecord: 'Healthy' },
        { id: 12,  name: 'Sarah Laker',    age: 2, mood: '😴', present: true,  nap: true,  milestone: 'Counting to 10',         invoiceStatus: 'paid',     parent: 'Mrs. Laker',     parentPhone: '256772001021', photoUrl: 'https://i.pravatar.cc/150?u=12', allergies: 'Dust', completedVaccines: ['BCG', 'Polio 0', 'Polio 1'], birthday: '2024-02-10', height: '88 cm', weight: '12.5 kg', activeScore: 620, favouriteMeals: 'Beans', enrollmentDate: '2025-03-01', healthRecord: 'Asthma' },
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
"""

# Replace the old constants with the new CENTERS array
content = re.sub(
    r'const CHILDCARE_KPIs = \{.*?\n  \};\n',
    centers_code,
    content,
    flags=re.DOTALL
)

# Remove the rest of the old constants up to MESSAGES
content = re.sub(
    r'  const CHILDREN = \[.*?\n  \];\n',
    '',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'  const TODAY_SCHEDULE = \[.*?\n  \];\n',
    '',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'  const MESSAGES = \[.*?\n  \];\n',
    '',
    content,
    flags=re.DOTALL
)

with open('web/os-childcare.jsx', 'w') as f:
    f.write(content)

