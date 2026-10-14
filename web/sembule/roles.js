export const ROLES = Object.freeze({ owner: 'Owner', director: 'Director', production_lead: 'Production lead' });
export function validRole(role) { return Object.hasOwn(ROLES, role); }
export function canViewMoney(role) { return role === 'owner' || role === 'director'; }
export function canManageSettings(role) { return role === 'owner'; }
export function canDeleteOperations(role) { return role === 'owner'; }
export function authorizedRole(row) { return row?.active === true && validRole(row.role) ? row.role : null; }
export const ROUTES = Object.freeze([
  { id: 'dashboard', label: 'Dashboard', group: 'Workspace', icon: 'grid', note: 'Your production day, at a glance.' },
  { id: 'leads', label: 'Pipeline', group: 'Workspace', icon: 'inbox', note: 'Every enquiry, from first call to a booked project.' },
  { id: 'clients', label: 'Clients', group: 'Workspace', icon: 'users', note: 'The people and organisations you work with.' },
  { id: 'holds', label: 'Date holds', group: 'Workspace', icon: 'calendar', note: 'Reserve dates while an enquiry is being confirmed.' },
  { id: 'jobs', label: 'Projects', group: 'Production', icon: 'clapper', note: 'Every project, from booking to delivery.' },
  { id: 'calendar', label: 'Calendar', group: 'Production', icon: 'calendar', note: 'Make room for the work ahead.' },
  { id: 'crew', label: 'Team', group: 'Production', icon: 'users', note: 'The right people, ready for each project.' },
  { id: 'equipment', label: 'Equipment', group: 'Production', icon: 'camera', note: 'Know what is ready, reserved and out on a project.' },
  { id: 'delivery', label: 'Editing & delivery', group: 'Production', icon: 'send', note: 'Keep revisions and final delivery in view.' },
  { id: 'reminders', label: 'Tasks', group: 'Workspace', icon: 'clock', note: 'Who to nudge today, one tap on WhatsApp.' },
  { id: 'quotes', label: 'Quotes', group: 'Finance', icon: 'file', money: true, note: 'Clear scope. Agreed prices. Confident bookings.' },
  { id: 'invoices', label: 'Invoices', group: 'Finance', icon: 'wallet', money: true, note: 'Keep billing and payment records together.' },
  { id: 'hire', label: 'Equipment hire', group: 'Finance', icon: 'wallet', money: true, note: 'Equipment hire terms and refundable deposits.' },
  { id: 'feedback', label: 'Reviews', group: 'Finance', icon: 'check', note: 'Ask for reviews. Thank people who send work.' },
  { id: 'expenses', label: 'Expenses', group: 'Finance', icon: 'receipt', money: true, note: 'Account for the cost of each production.' },
  { id: 'reports', label: 'Reports', group: 'Finance', icon: 'grid', money: true, note: 'Money in, what sells, and who still owes.' },
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
