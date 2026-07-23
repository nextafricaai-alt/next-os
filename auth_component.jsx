  const AuthScreen = ({ supabase, onLogin }) => {
    const [mode, setMode] = React.useState('login'); // 'login' | 'signup' | 'otp'
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [otpCode, setOtpCode] = React.useState('');
    const [role, setRole] = React.useState('parent');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    const handleAuth = async (e) => {
      e.preventDefault();
      if (!supabase) return setError("System disconnected");
      setLoading(true); setError(null);
      try {
        if (mode === 'signup') {
          const { data, error: signUpErr } = await supabase.auth.signUp({
            email, password, options: { data: { role } }
          });
          if (signUpErr) throw signUpErr;
          setMode('otp'); // proceed to enter OTP
        } else if (mode === 'login') {
          const { data, error: signInErr } = await supabase.auth.signInWithPassword({
            email, password
          });
          if (signInErr) {
            if (signInErr.message.includes('Email not confirmed')) setMode('otp');
            else throw signInErr;
          } else if (data.session) {
            onLogin(data.user);
          } else {
            setMode('otp');
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const handleVerifyOtp = async (e) => {
      e.preventDefault();
      if (!supabase) return;
      setLoading(true); setError(null);
      try {
        const { data, error: otpErr } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' });
        if (otpErr) throw otpErr;
        if (data.session) onLogin(data.user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deepest)', fontFamily: 'var(--font-body)', padding: 20 }}>
        <div style={{ background: 'var(--bg-default)', padding: 40, borderRadius: 16, border: '1px solid var(--border-subtle)', width: '100%', maxWidth: 420, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--mint)', margin: '0 0 8px 0' }}>Next OS</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Childcare Management System</p>
          </div>

          {error && <div style={{ background: 'rgba(255, 71, 87, 0.1)', color: '#FF4757', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 24, border: '1px solid rgba(255, 71, 87, 0.3)' }}>{error}</div>}

          {mode === 'otp' ? (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 8 }}>Enter the 6-digit one-time code sent to <strong>{email}</strong></div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>One-Time Code</label>
                <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="000000" required style={{ width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: 8, fontSize: 18, textAlign: 'center', letterSpacing: '4px', outline: 'none' }} />
              </div>
              <button type="submit" disabled={loading} style={{ background: 'var(--mint)', color: '#060012', border: 'none', padding: 14, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8 }}>{loading ? 'Verifying...' : 'Verify & Login'}</button>
              <button type="button" onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>Back to Login</button>
            </form>
          ) : (
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mode === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Role</label>
                  <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: 8, fontSize: 14, outline: 'none' }}>
                    <option value="parent">Parent</option>
                    <option value="director">Global Director</option>
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required style={{ width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: 8, fontSize: 14, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} style={{ width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '12px 16px', borderRadius: 8, fontSize: 14, outline: 'none' }} />
              </div>
              <button type="submit" disabled={loading} style={{ background: 'var(--mint)', color: '#060012', border: 'none', padding: 14, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8 }}>
                {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
              
              <div style={{ textAlign: 'center', marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                </span>
                <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: 'var(--mint)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {mode === 'login' ? 'Sign Up' : 'Log In'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };
