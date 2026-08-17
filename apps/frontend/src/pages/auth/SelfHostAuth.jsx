import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Loader2, AlertTriangle, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import api from '../../lib/api';
import AmbientBackground from '../../components/AmbientBackground';
import logo from '../../assets/logo.svg';

// A self-hosted instance has exactly one account, seeded by the installer, so
// this page never asks for an email — and never shows the owner's either. The
// address is the second half of the credential; printing it on a public page
// would hand an attacker everything but the password.
export default function SelfHostAuth() {
  const [stage, setStage] = useState('password');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [scopedToken, setScopedToken] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (lockoutTimer > 0) {
      const t = setTimeout(() => setLockoutTimer(lockoutTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [lockoutTimer]);

  const land = (data) => {
    localStorage.setItem('blinkbox_token', data.token);
    localStorage.setItem('blinkbox_user', JSON.stringify(data.user));
    navigate('/dashboard');
  };

  const fail = (err, fallback) => {
    const data = err.response?.data;
    if (data?.lockoutTimer) setLockoutTimer(data.lockoutTimer);
    setError(data?.message || fallback);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/api/auth/login', { password });
      if (data.twoFactorRequired) {
        setTwoFactorToken(data.twoFactorToken);
        setTwoFactorCode('');
        setStage('twofactor');
        return;
      }
      if (data.mustChangePassword) {
        setScopedToken(data.token);
        setStage('change');
        return;
      }
      land(data);
    } catch (err) {
      fail(err, 'Sign in failed. Please try again.');
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
      const { data } = await api.post('/api/auth/login/2fa', { twoFactorToken, code: twoFactorCode });
      land(data);
    } catch (err) {
      fail(err, 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Those two passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.post(
        '/api/auth/owner/password',
        { currentPassword: password, newPassword },
        { headers: { Authorization: `Bearer ${scopedToken}` } },
      );
      setPassword('');
      land(data);
    } catch (err) {
      fail(err, 'Could not set that password.');
    } finally {
      setIsLoading(false);
    }
  };

  const heading =
    stage === 'twofactor' ? 'Two-factor code'
    : stage === 'change' ? 'Choose your password'
    : 'Unlock this instance';

  const sub =
    stage === 'twofactor' ? 'Enter the 6-digit code from your authenticator app.'
    : stage === 'change' ? 'The setup password expires. Replace it with one only you know.'
    : 'Enter the password your installer printed.';

  return (
    <div className="auth-root relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[var(--bb-surface-0)] px-6 py-12">
      <AmbientBackground />

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideSwitch { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) { .auth-root *, .auth-root { animation: none !important; } }
      `}</style>

      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[420px] w-[720px] -translate-x-1/2"
        style={{ background: 'radial-gradient(ellipse at center, rgba(111,151,232,0.09), transparent 70%)' }}
      />

      <div
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
        <span className="flex items-center gap-1.5 rounded-full border border-[var(--bb-border-subtle)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--bb-text-dim)]">
          <ShieldCheck className="h-3 w-3" /> Self-hosted
        </span>
      </div>

      <div
        className="bb-card relative z-10 w-full max-w-[400px] p-7"
        style={{ animation: mounted ? 'fadeUp 0.55s ease-out 0.06s both' : 'none' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(111,151,232,0.5), transparent)' }}
        />

        <div key={stage} style={{ animation: 'slideSwitch 0.3s ease-out' }}>
          <h1 className="text-[20px] font-bold tracking-tight text-[var(--bb-text-hi)]">{heading}</h1>
          <p className="mb-6 mt-1 text-[13px] text-[var(--bb-text-lo)]">{sub}</p>
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

        {stage === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--bb-text-lo)]">Password</label>
            <div className="group relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bb-text-dim)] transition-colors duration-200 group-focus-within:text-[var(--bb-text-hi)]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={lockoutTimer > 0}
                className="bb-input w-full py-2.5 pl-9 pr-10 text-[13px] disabled:opacity-40"
                placeholder="••••••••••••"
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

            <button
              type="submit"
              disabled={isLoading || lockoutTimer > 0}
              className={`bb-btn mt-5 flex w-full items-center justify-center gap-2 py-2.5 text-[13px] focus:outline-none ${
                lockoutTimer > 0 ? 'cursor-not-allowed bg-[var(--bb-surface-2)] text-[var(--bb-text-dim)]' : 'bb-btn-primary'
              }`}
            >
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</>
                : lockoutTimer > 0 ? <>Wait {lockoutTimer}s</>
                : <>Unlock <ArrowRight className="h-4 w-4" /></>}
            </button>

            <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-[var(--bb-text-dim)]">
              <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Lost it? On the server run <code className="text-[var(--bb-text-lo)]">docker compose exec backend node apps/backend/src/modules/selfhost/resetOwner.js</code>
            </p>
          </form>
        )}

        {stage === 'twofactor' && (
          <form onSubmit={handleTwoFactorSubmit}>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
              className="bb-input w-full py-3 text-center text-[20px] tracking-[0.5em]"
              placeholder="000000"
            />
            <button
              type="submit"
              disabled={isLoading || twoFactorCode.length !== 6}
              className="bb-btn bb-btn-primary mt-5 flex w-full items-center justify-center gap-2 py-2.5 text-[13px] focus:outline-none disabled:opacity-40"
            >
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : <>Verify <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        )}

        {stage === 'change' && (
          <form onSubmit={handleChangeSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--bb-text-lo)]">New password</label>
              <input
                type="password"
                required
                autoFocus
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bb-input w-full py-2.5 px-3 text-[13px]"
                placeholder="12+ characters, mixed case and a digit"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--bb-text-lo)]">Confirm</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bb-input w-full py-2.5 px-3 text-[13px]"
                placeholder="Type it again"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bb-btn bb-btn-primary mt-2 flex w-full items-center justify-center gap-2 py-2.5 text-[13px] focus:outline-none disabled:opacity-40"
            >
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <>Finish setup <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        )}
      </div>

      <p className="relative z-10 mt-8 text-[11px] text-[var(--bb-text-dim)]">
        Your workflows and data never leave this machine.
      </p>
    </div>
  );
}
