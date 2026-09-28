const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  inbox: '<path d="M3 13 6 4h12l3 9v7H3z"/><path d="M3 13h5l2 3h4l2-3h5"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>',
  clapper: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="m3 8 17-4-1-3L2 5zm4-4 3 3m3-5 3 3M3 12h18"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 5h2m4 0h2"/>',
  camera: '<path d="M8 5 6 8H3v12h18V8h-3l-2-3z"/><circle cx="12" cy="13" r="4"/>',
  send: '<path d="m21 3-7 18-4-7-7-4zm0 0L10 14"/>',
  file: '<path d="M14 2H5v20h14V7zm0 0v6h5M8 12h8m-8 4h6"/>',
  wallet: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 8V4l14-2v3m4 7h-6v5h6m-3-2.5h.01"/>',
  receipt: '<path d="M5 3 8 5l4-2 4 2 3-2v18l-3-2-4 2-4-2-3 2zM8 9h8m-8 4h8"/>',
  settings: '<path d="m9 3-1 3-3 1 1 4-2 2 2 3 3-1 3 3 3-2 3 1 2-4-2-2 1-3-4-1-1-3z"/><circle cx="12" cy="11" r="3"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  logout: '<path d="M9 3H4v18h5m5-14 5 5-5 5m-6-5h11"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  shield: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 12l3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>'
};
export function icon(name, className = '') { return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`; }
