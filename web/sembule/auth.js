import { authorizedRole } from './roles.js';
import { withTimeout } from './utils.js';
export class AccessError extends Error {}
export function createAuth(client) {
  async function identity() {
    const { data: sessionData, error: sessionError } = await withTimeout(client.auth.getSession());
    if (sessionError) throw sessionError;
    if (!sessionData.session) return null;
    const { data, error } = await withTimeout(client.auth.getUser());
    if (error || !data.user) throw new AccessError('Please sign in again to continue.');
    const assignment = await withTimeout(client.from('user_roles').select('role,active').eq('user_id', data.user.id).maybeSingle());
    if (assignment.error) throw new AccessError('We could not verify your access. Please retry when connected.');
    const role = authorizedRole(assignment.data);
    if (!role) throw new AccessError('Your account does not have active workspace access. Please contact the owner.');
    const profile = await withTimeout(client.from('profiles').select('display_name').eq('id', data.user.id).maybeSingle());
    if (profile.error) throw new AccessError('Your profile could not be loaded. Please try again.');
    return { id: data.user.id, role, name: profile.data?.display_name || data.user.email, preview: false };
  }
  return {
    identity,
    async signIn(email, password) {
      const { error } = await withTimeout(client.auth.signInWithPassword({ email, password }));
      if (error) throw new AccessError('Sign-in failed. Check your email and password, then try again.');
      return identity();
    },
    async signOut() {
      try { await withTimeout(client.auth.signOut({ scope: 'local' })); }
      finally { window.sessionStorage.removeItem('sembule-session'); }
    },
    onChange(callback) {
      // Keep async database work outside the auth callback's internal lock.
      return client.auth.onAuthStateChange(event => {
        if (event !== 'INITIAL_SESSION') setTimeout(() => callback(event), 0);
      }).data.subscription;
    }
  };
}
