export const ROLES = Object.freeze({ owner: 'Owner', director: 'Director', production_lead: 'Production lead' });
export function validRole(role) { return Object.hasOwn(ROLES, role); }
export function canViewMoney(role) { return role === 'owner' || role === 'director'; }
export function canManageSettings(role) { return role === 'owner'; }
export function canDeleteOperations(role) { return role === 'owner'; }
export function authorizedRole(row) { return row?.active === true && validRole(row.role) ? row.role : null; }
export const ROUTES = Object.freeze([
  { id: 'dashboard', label: 'Dashboard', group: 'Today', icon: 'grid', note: 'What needs you today, then money, then work.' },
  { id: 'leads', label: 'Pipeline', group: 'Win the work', icon: 'inbox', note: 'Every enquiry, from first call to a booked project.' },
  { id: 'quotes', label: 'Quotes', group: 'Win the work', icon: 'file', money: true, note: 'Clear scope. Agreed prices. Confident bookings.' },
  { id: 'clients', label: 'Clients', group: 'Win the work', icon: 'users', note: 'The people and organisations you work with.' },
  { id: 'holds', label: 'Date holds', group: 'Win the work', icon: 'calendar', note: 'Reserve dates while an enquiry is being confirmed.' },
  { id: 'jobs', label: 'Projects', group: 'Do the work', icon: 'clapper', note: 'Book a job, brief the client, plan the team and kit, follow the money.' },
  { id: 'calendar', label: 'Calendar', group: 'Do the work', icon: 'calendar', note: 'Make room for the work ahead.' },
  { id: 'crew', label: 'Team', group: 'Do the work', icon: 'users', note: 'The right people, ready for each project.' },
  { id: 'equipment', label: 'Equipment', group: 'Do the work', icon: 'camera', note: 'Know what is ready, reserved and out on a project.' },
  { id: 'delivery', label: 'Editing & delivery', group: 'Do the work', icon: 'send', note: 'Keep revisions and final delivery in view.' },
  { id: 'invoices', label: 'Invoices & receipts', group: 'Money', icon: 'wallet', money: true, note: 'Bill the client, record every payment, print the receipt.' },
  { id: 'expenses', label: 'Expenses', group: 'Money', icon: 'receipt', money: true, note: 'Every cost, linked to its project, so profit is real.' },
  { id: 'teampay', label: 'Pay the team', group: 'Money', icon: 'users', money: true, note: 'Everyone owed for their work, in one list.' },
  { id: 'buckets', label: 'Buckets', group: 'Money', icon: 'wallet', money: true, owner: true, note: 'Tithe first, then every shilling of profit gets a job.' },
  { id: 'hire', label: 'Equipment hire', group: 'Money', icon: 'wallet', money: true, note: 'Equipment hire terms and refundable deposits.' },
  { id: 'reports', label: 'Reports', group: 'Money', icon: 'grid', money: true, note: 'Money in, what sells, and who still owes.' },
  { id: 'reminders', label: 'Tasks', group: 'Follow up', icon: 'clock', note: 'Who to nudge today, one tap on WhatsApp.' },
  { id: 'feedback', label: 'Reviews', group: 'Follow up', icon: 'check', note: 'Ask for reviews. Thank people who send work.' },
  { id: 'website', label: 'Website editor', group: 'Manage', icon: 'screen', owner: true, visibleToAllSignedIn: true, note: 'Update the public Sembule Media website.' },
  { id: 'settings', label: 'Settings', group: 'Manage', icon: 'settings', owner: true, note: 'Company details and the way you work.' }
]);
export function allowedRoute(route, role) {
  return validRole(role) && (!route.money || canViewMoney(role)) && (!route.owner || canManageSettings(role));
}
export function routesFor(role) {
  return ROUTES.filter(route => allowedRoute(route, role) || (validRole(role) && route.visibleToAllSignedIn === true));
}
export function resolveRoute(id, role) { return routesFor(role).find(route => route.id === id) || routesFor(role)[0] || null; }
