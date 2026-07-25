import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, AlertTriangle, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import api from '../../lib/api';
import { GoogleLogin } from '@react-oauth/google';
import AmbientBackground from '../../components/AmbientBackground';
import logo from '../../assets/logo.svg';

const GOOGLE_ENABLED = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const resetToken = location.pathname === '/reset-password' ? searchParams.get('token') : null;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (lockoutTimer > 0) {
      const timer = setTimeout(() => setLockoutTimer(lockoutTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutTimer]);

  const switchMode = (login) => {
    setIsLogin(login);
    setError(null);
    setLockoutTimer(0);
    setFormKey((k) => k + 1);
  };

  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/auth/google', {
        credential: credentialResponse.credential,
      });
      localStorage.setItem('blinkbox_token', response.data.token);
      localStorage.setItem('blinkbox_user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Google authentication failed.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;
    if (resetToken) {
      setIsLoading(true);
      setError(null);
      try {
        await api.post('/api/auth/reset-password', { token: resetToken, password });
        setResetDone(true);
        setTimeout(() => navigate('/login'), 2500);
      } catch (err) {
        setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    setIsLoading(true);
    setError(null);
    const endpoint = isLogin ? '/login' : '/register';
    const payload = isLogin ? { email, password } : { name, email, password };
    try {
      const response = await api.post(`/api/auth${endpoint}`, payload);
      if (response.data.needsVerification) {
        setVerifyEmail(response.data.email || email);
        setVerifyPending(true);
        return;
      }
      if (response.data.twoFactorRequired) {
        setTwoFactorToken(response.data.twoFactorToken);
        setTwoFactorCode('');
        return;
      }
      localStorage.setItem('blinkbox_token', response.data.token);
      localStorage.setItem('blinkbox_user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.needsVerification) {
        setVerifyEmail(data.email || email);
        setVerifyPending(true);
        return;
      }
      if (data?.lockoutTimer) setLockoutTimer(data.lockoutTimer);
      setError(data?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    if (twoFactorCode.length !== 6) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/auth/login/2fa', {
        twoFactorToken,
        code: twoFactorCode,
      });
      localStorage.setItem('blinkbox_token', response.data.token);
      localStorage.setItem('blinkbox_user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 401 && data?.message?.includes('expired')) {
        setTwoFactorToken('');
      }
      setError(data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email: forgotEmail });
      setForgotSent(true);
    } catch {
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      await api.post('/api/auth/resend-verification', { email: verifyEmail });
    } catch { /* always show success */ }
    setResendLoading(false);
    setResendSent(true);
    setResendCooldown(60);
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  return (
    <div className="auth-root relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[var(--bb-surface-0)] px-6 py-12">
      <AmbientBackground />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideSwitch {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-root *, .auth-root { animation: none !important; }
        }
        .field-enter { animation: fadeUp 0.35s ease-out both; }
        .google-btn-wrapper, .google-btn-wrapper > div, .google-btn-wrapper iframe { width: 100% !important; height: 100% !important; }
      `}</style>

      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[420px] w-[720px] -translate-x-1/2"
        style={{ background: 'radial-gradient(ellipse at center, rgba(111,151,232,0.09), transparent 70%)' }}
      />

      {/* brand */}
      <Link
        to="/"
        className="relative z-10 mb-8 flex flex-col items-center gap-3"
        style={{ animation: mounted ? 'fadeUp 0.5s ease-out both' : 'none' }}
      >
        <img
          src={logo}
          alt="Blinkbox"
          className="h-10 w-10 object-contain"
          style={{ filter: 'drop-shadow(0 0 14px rgba(111,151,232,0.35))' }}
        />
        <span className="text-[15px] font-semibold tracking-tight text-[var(--bb-text-hi)]">blinkbox</span>
      </Link>

      {/* auth card */}
      <div
        className="bb-card relative z-10 w-full max-w-[400px] p-7"
        style={{ animation: mounted ? 'fadeUp 0.55s ease-out 0.06s both' : 'none' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(111,151,232,0.5), transparent)' }}
        />

        {!resetToken && (
          <div className="bb-seg mb-7 flex">
            {['Log In', 'Register'].map((label, i) => {
              const active = i === 0 ? isLogin : !isLogin;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => switchMode(i === 0)}
                  className={`bb-seg-btn flex-1 py-2 text-[13px] font-semibold ${active ? 'is-active' : ''}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div key={`heading-${formKey}`} style={{ animation: 'slideSwitch 0.3s ease-out' }}>
          <h1 className="text-[20px] font-bold tracking-tight text-[var(--bb-text-hi)]">
            {resetToken ? 'Set a new password' : isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mb-6 mt-1 text-[13px] text-[var(--bb-text-lo)]">
            {resetToken ? 'Choose a strong password (8+ characters).' : isLogin ? 'Sign in to your workspace.' : 'Start automating in under a minute.'}
          </p>
        </div>

        {error && (
          <div
            className="mb-5 flex items-start gap-2.5 rounded-[10px] border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-[12px] text-red-400"
            style={{ animation: 'fadeUp 0.2s ease-out' }}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} key={`form-${formKey}`}>
          <div className="flex flex-col gap-3.5">
            {!isLogin && (
              <div className="field-enter" style={{ animationDelay: '0s' }}>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--bb-text-lo)]">Full Name</label>
                <div className="group relative">
                  <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bb-text-dim)] transition-colors duration-200 group-focus-within:text-[var(--bb-text-hi)]" />
                  <input
                    type="text" required={!isLogin} value={name}
                    onChange={(e) => setName(e.target.value)} disabled={lockoutTimer > 0}
                    className="bb-input w-full py-2.5 pl-9 pr-3 text-[13px] disabled:opacity-40"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            {!resetToken && (
              <div className="field-enter" style={{ animationDelay: isLogin ? '0s' : '0.06s' }}>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--bb-text-lo)]">Email</label>
                <div className="group relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bb-text-dim)] transition-colors duration-200 group-focus-within:text-[var(--bb-text-hi)]" />
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)} disabled={lockoutTimer > 0}
                    className="bb-input w-full py-2.5 pl-9 pr-3 text-[13px] disabled:opacity-40"
                    placeholder="you@company.com"
                  />
                </div>
              </div>
            )}

            <div className="field-enter" style={{ animationDelay: isLogin ? '0.06s' : '0.12s' }}>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--bb-text-lo)]">Password</label>
              <div className="group relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bb-text-dim)] transition-colors duration-200 group-focus-within:text-[var(--bb-text-hi)]" />
                <input
                  type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)} disabled={lockoutTimer > 0}
                  className="bb-input w-full py-2.5 pl-9 pr-10 text-[13px] disabled:opacity-40"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--bb-text-dim)] transition-colors hover:text-[var(--bb-text-mid)]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {isLogin && !resetToken && (
            <div className="mt-2 text-right">
              <button type="button" onClick={() => { setForgotOpen(true); setForgotSent(false); setForgotEmail(''); }} className="text-[11px] text-[var(--bb-text-dim)] transition-colors hover:text-[var(--bb-text-mid)]">
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || lockoutTimer > 0}
            className={`bb-btn mt-5 flex w-full items-center justify-center gap-2 py-2.5 text-[13px] focus:outline-none ${
              lockoutTimer > 0
                ? 'cursor-not-allowed bg-[var(--bb-surface-2)] text-[var(--bb-text-dim)]'
                : 'bb-btn-primary'
            }`}
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {resetToken ? 'Updating…' : 'Authenticating…'}</>
            ) : lockoutTimer > 0 ? (
              <>Wait {lockoutTimer}s</>
            ) : (
              <>{resetToken ? 'Set new password' : isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        {!resetToken && GOOGLE_ENABLED && (
          <>
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--bb-border-subtle)]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[var(--bb-surface-1)] px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--bb-text-dim)]">or</span>
              </div>
            </div>

            <div className="group relative h-[44px] w-full">
              <div className="pointer-events-none absolute inset-0 flex h-full w-full items-center justify-center gap-3 rounded-[10px] border border-[var(--bb-border-subtle)] bg-[var(--bb-surface-0)] text-[13px] font-medium text-[var(--bb-text-mid)] transition-all group-hover:border-[var(--bb-border)] group-hover:text-[var(--bb-text-hi)]">
                <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
              </div>
              <div className="google-btn-wrapper absolute inset-0 h-full w-full opacity-[0.001] [&>div]:!w-full [&_iframe]:!w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in failed. Please try again.')}
                  theme="filled_black"
                  size="large"
                  width="380"
                  shape="rectangular"
                  text={isLogin ? 'signin_with' : 'signup_with'}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <p
        className="relative z-10 mt-6 text-center text-[11px] text-[var(--bb-text-dim)]"
        style={{ animation: mounted ? 'fadeIn 0.6s ease-out 0.25s both' : 'none' }}
      >
        By continuing, you agree to our{' '}
        <Link to="/terms" className="transition-colors hover:text-[var(--bb-text-mid)]">Terms of Service</Link>
        {' '}and{' '}
        <Link to="/privacy" className="transition-colors hover:text-[var(--bb-text-mid)]">Privacy Policy</Link>.
      </p>

      {twoFactorToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
          style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <form onSubmit={handleTwoFactorSubmit}
            className="bb-glass-strong mx-4 flex w-full max-w-[380px] flex-col items-center p-8 text-center"
            style={{ animation: 'scaleIn 0.2s ease-out' }}>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--bb-accent-ring)] bg-[var(--bb-accent-soft)]">
              <ShieldCheck className="h-7 w-7 text-[var(--bb-accent)]" />
            </div>
            <h2 className="mb-2 text-[18px] font-bold text-[var(--bb-text-hi)]">Two-factor authentication</h2>
            <p className="mb-6 text-[13px] leading-relaxed text-[var(--bb-text-lo)]">
              Enter the 6-digit code from your authenticator app.
            </p>
            <input
              autoFocus
              value={twoFactorCode}
              onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              className="bb-input mb-4 w-full px-4 py-3 text-center font-mono text-[20px] tracking-[0.4em]"
            />
            {error && (
              <div className="mb-4 flex items-center gap-2 text-[12px] text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading || twoFactorCode.length !== 6}
              className="bb-btn bb-btn-primary mb-3 flex w-full items-center justify-center gap-2 py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : <>Verify <ArrowRight className="h-4 w-4" /></>}
            </button>
            <button
              type="button"
              onClick={() => { setTwoFactorToken(''); setTwoFactorCode(''); setError(null); }}
              className="text-[12px] text-[var(--bb-text-dim)] transition-colors hover:text-[var(--bb-text-hi)]"
            >
              Back to sign in
            </button>
          </form>
        </div>
      )}

      {verifyPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
          style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="bb-glass-strong mx-4 flex w-full max-w-[380px] flex-col items-center p-8 text-center"
            style={{ animation: 'scaleIn 0.2s ease-out' }}>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--bb-accent-ring)] bg-[var(--bb-accent-soft)]">
              <Mail className="h-7 w-7 text-[var(--bb-accent)]" />
            </div>
            <h2 className="mb-2 text-[18px] font-bold text-[var(--bb-text-hi)]">Check your email</h2>
            <p className="mb-1 text-[13px] leading-relaxed text-[var(--bb-text-lo)]">
              We sent a verification link to
            </p>
            <p className="mb-6 break-all text-[13px] font-semibold text-[var(--bb-text-hi)]">{verifyEmail}</p>
            <p className="mb-6 text-[12px] leading-relaxed text-[var(--bb-text-dim)]">
              Click the link in the email to activate your account. The link expires in 24 hours.
            </p>

            {resendSent && (
              <div className="mb-4 flex items-center gap-2 text-[12px] text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                New verification email sent!
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0}
              className="bb-btn bb-btn-ghost mb-3 flex w-full items-center justify-center gap-2 py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {resendLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend email'
              )}
            </button>

            <button
              onClick={() => { setVerifyPending(false); switchMode(true); }}
              className="text-[12px] text-[var(--bb-text-dim)] transition-colors hover:text-[var(--bb-text-mid)]"
            >
              Back to sign in
            </button>
          </div>
        </div>
      )}

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={() => setForgotOpen(false)}>
          <div className="bb-glass-strong mx-4 w-full max-w-sm p-6" onClick={e => e.stopPropagation()}
            style={{ animation: 'scaleIn 0.15s ease-out' }}>
            {forgotSent ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                <p className="text-[14px] font-semibold text-[var(--bb-text-hi)]">Check your inbox</p>
                <p className="text-center text-[12px] text-[var(--bb-text-lo)]">If an account exists for that email, we sent a reset link. It expires in 15 minutes.</p>
                <button onClick={() => setForgotOpen(false)} className="mt-2 text-[12px] text-[var(--bb-text-dim)] transition-colors hover:text-[var(--bb-text-mid)]">Close</button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                <div>
                  <p className="mb-1 text-[15px] font-semibold text-[var(--bb-text-hi)]">Reset your password</p>
                  <p className="text-[12px] text-[var(--bb-text-lo)]">Enter your email and we'll send a reset link.</p>
                </div>
                <div className="bb-input flex items-center gap-2.5 px-3 py-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-[var(--bb-text-dim)]" />
                  <input
                    type="email" required autoFocus
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-transparent text-[13px] text-[var(--bb-text-hi)] placeholder:text-[var(--bb-text-dim)] focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForgotOpen(false)}
                    className="bb-btn bb-btn-ghost flex-1 py-2 text-[13px]">
                    Cancel
                  </button>
                  <button type="submit" disabled={forgotLoading}
                    className="bb-btn bb-btn-primary flex flex-1 items-center justify-center gap-2 py-2 text-[13px] disabled:opacity-50">
                    {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {resetDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            <p className="text-[16px] font-semibold text-[var(--bb-text-hi)]">Password updated!</p>
            <p className="text-[13px] text-[var(--bb-text-lo)]">Redirecting to sign in…</p>
          </div>
        </div>
      )}
    </div>
  );
}
