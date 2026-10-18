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
export function dateLabel(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Kampala' }).format(date);
}
export function initials(name) { return String(name).trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
