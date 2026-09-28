import { CONFIG, connectionState } from './config.js';
let clientPromise;
export function getClient() {
  if (connectionState() !== 'configured') throw new Error('Sign-in is not set up yet.');
  if (!clientPromise) clientPromise = import('https://esm.sh/@supabase/supabase-js@2.57.4').then(({ createClient }) =>
    createClient(CONFIG.supabaseUrl, CONFIG.publishableKey, {
      auth: { storage: window.sessionStorage, storageKey: 'sembule-session', persistSession: true,
        autoRefreshToken: true, detectSessionInUrl: false },
      global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store',
        signal: options.signal || AbortSignal.timeout(15000) }) }
    })
  ).catch(error => { clientPromise = null; throw error; });
  return clientPromise;
}
// Session 2 reads identity/role only. Business data loads in later modules, on demand.
