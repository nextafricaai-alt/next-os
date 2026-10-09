// Public configuration only. Never put a secret key or a password in this file.
export const CONFIG = Object.freeze({
  name: 'Sembule Media', legalName: 'Sembule Media Ltd',
  website: 'sembulemedia.com', phone: '+256 774 345634',
  timezone: 'Africa/Kampala', version: '0.8.5',
  supabaseUrl: 'https://stpawtberphnvhcxjmkj.supabase.co',
  publishableKey: 'sb_publishable_RvlRBmtSxrtAXDsUKn91QQ_XwWZOpt_',
  // [CONFIRM: account invitations before enabling real role testing.]
  // [CONFIRM: full address, email, rates, terms, payment recipients and exchange-rate method.]
  logo: './assets/brand/logo.png', mark: './assets/brand/mark.png',
  stages: Object.freeze(['Enquiry', 'Quoted', 'Confirmed', 'Planning', 'Production', 'Editing', 'Review', 'Delivered and paid'])
});
export function connectionState(config = CONFIG) {
  if (!config.supabaseUrl && !config.publishableKey) return 'unconfigured';
  try {
    const url = new URL(config.supabaseUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return 'invalid';
    const key = config.publishableKey;
    if (key.startsWith('sb_publishable_') && key.length > 25) return 'configured';
    // Accept a legacy public key only when its role is explicitly anon.
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'anon' ? 'configured' : 'invalid';
  } catch { return 'invalid'; }
}
export function canPreview(hostname, config = CONFIG) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname) && connectionState(config) === 'unconfigured';
}
