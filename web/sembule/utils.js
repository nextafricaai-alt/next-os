export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}
export async function withTimeout(promise, ms = 15000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('The connection is taking too long. Please try again.')), ms);
    })]);
  } finally { clearTimeout(timer); }
}
// Turn database errors into plain words Tony can act on.
export function friendly(message = '') {
  const m = String(message);
  if (/ends_at|jobs_check/i.test(m)) return 'The end time must be after the start time. Change "Ends" and save again.';
  if (/row-level security|permission denied/i.test(m)) return 'Your account is not allowed to save this. Ask the owner to check your role in Settings.';
  if (/JWT|expired|refresh token|not authenticated|Auth session missing/i.test(m)) return 'You were signed out while the app was idle. Sign in again, then save.';
  if (/Failed to fetch|NetworkError|taking too long|aborted|timeout/i.test(m)) return 'No connection to the server. Check the internet, then tap Save again. Nothing was lost.';
  if (/duplicate|unique/i.test(m)) return 'This already exists. Refresh the page and check the list.';
  if (/null value in column/i.test(m)) { const c = (m.match(/column "(\w+)"/) || [])[1]; return `A required detail is missing${c ? ` (${c.replace(/_/g, ' ')})` : ''}. Fill it in and save again.`; }
  if (/check constraint/i.test(m)) return 'One of the values is not allowed. Check the dates, numbers and choices, then save again.';
  return m || 'Something went wrong. Please try again.';
}
export function dateLabel(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Kampala' }).format(date);
}
export function initials(name) { return String(name).trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
