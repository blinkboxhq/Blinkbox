import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, AlertTriangle, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import api from '../../lib/api';
import { GoogleLogin } from '@react-oauth/google';
import logo from '../../assets/logo.svg';

/* ═══════════════════════════════════════════════════════════════════════════
   PARTICLE CANVAS — subtle floating dots with gentle connections
   ═══════════════════════════════════════════════════════════════════════════ */
function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const createParticles = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      particles = Array.from({ length: 50 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.15 + 0.03,
      }));
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.o})`;
        ctx.fill();
      }

      // Subtle connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${0.03 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    resize();
    createParticles();
    draw();
    window.addEventListener('resize', () => { resize(); createParticles(); });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TYPING EFFECT — cycles through automation phrases
   ═══════════════════════════════════════════════════════════════════════════ */
function TypingCycle() {
  const phrases = [
    'scrape 200 URLs in parallel',
    'trigger workflows on webhook',
    'route data with AI agents',
    'encrypt secrets with AES-256',
    'deploy automations in seconds',
  ];
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = phrases[index];
    let timeout;

    if (!deleting) {
      if (text.length < phrase.length) {
        timeout = setTimeout(() => setText(phrase.slice(0, text.length + 1)), 50 + Math.random() * 30);
      } else {
        timeout = setTimeout(() => setDeleting(true), 2000);
      }
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => setText(text.slice(0, -1)), 25);
      } else {
        setDeleting(false);
        setIndex((i) => (i + 1) % phrases.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [text, deleting, index]);

  return (
    <span className="text-white">
      {text}
      <span className="inline-block w-[2px] h-[1.1em] bg-white/60 ml-0.5 align-text-bottom" style={{ animation: 'blink 1s step-end infinite' }} />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN AUTH COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
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
      // Reset password mode
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
    <div className="flex min-h-screen w-full bg-black text-white overflow-hidden">

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes slideSwitch {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.15; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .field-enter { animation: fadeUp 0.35s ease-out both; }
        .google-btn-wrapper, .google-btn-wrapper > div, .google-btn-wrapper iframe { width: 100% !important; height: 100% !important; }
      `}</style>

      {/* ━━━ LEFT — Brand panel ━━━ */}
      <div className="hidden lg:flex relative w-[45%] flex-col items-center justify-center border-r border-white/[0.04] overflow-hidden">
        <ParticleField />

        {/* Radial fade at edges */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_40%,black_100%)] pointer-events-none" />

        <div
          className="relative z-10 flex flex-col items-center max-w-xs text-center"
          style={{ animation: mounted ? 'fadeUp 0.7s ease-out' : 'none', opacity: mounted ? undefined : 0 }}
        >
          {/* Logo with pulse ring */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-white/10" style={{ animation: 'pulse-ring 3s ease-out infinite' }} />
            <img
              src={logo}
              alt="BlinkBox"
              className="relative w-16 h-16 object-contain"
              style={{ animation: 'float 6s ease-in-out infinite' }}
            />
          </div>

          <h1 className="text-3xl font-black tracking-[0.05em] mb-2">Blinkbox</h1>
          <p className="text-[11px] tracking-[0.3em] text-neutral-600 uppercase mb-10">Automation Engine</p>

          {/* Typing line */}
          <div
            className="text-sm text-neutral-500 h-6"
            style={{ animation: mounted ? 'fadeIn 0.8s ease-out 0.5s both' : 'none' }}
          >
            <TypingCycle />
          </div>

          {/* Trust signals — real, no sugarcoating */}
          <div
            className="mt-14 flex flex-col gap-3"
            style={{ animation: mounted ? 'fadeUp 0.6s ease-out 0.8s both' : 'none' }}
          >
            {[
              'Open-source automation engine',
              'Self-hostable, no vendor lock-in',
              'AES-256 encrypted vault',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2.5 text-neutral-700 text-xs">
                <div className="w-1 h-1 rounded-full bg-neutral-700 shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ━━━ RIGHT — Auth form ━━━ */}
      <div className="w-full lg:w-[55%] flex items-center justify-center px-6 py-12 relative">
        {/* Subtle gradient wash */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.01] rounded-full blur-[150px] pointer-events-none" />

        <div
          className="w-full max-w-[380px] relative z-10"
          style={{ animation: mounted ? 'scaleIn 0.5s ease-out 0.1s both' : 'none' }}
        >
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-10">
            <img src={logo} alt="Blinkbox" className="w-6 h-6 object-contain" />
            <span className="text-sm font-bold tracking-[0.05em]">Blinkbox</span>
          </Link>

          {/* Mode toggle — hidden on reset-password route */}
          {!resetToken && (
            <div className="flex p-0.5 rounded-lg mb-7 bg-neutral-950 border border-neutral-900/80">
              {['Log In', 'Register'].map((label, i) => {
                const active = i === 0 ? isLogin : !isLogin;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => switchMode(i === 0)}
                    className={`flex-1 py-2 text-[13px] font-semibold rounded-md transition-all duration-300 ${
                      active ? 'bg-white text-black' : 'text-neutral-600 hover:text-neutral-400'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Heading — switches with animation */}
          <div key={`heading-${formKey}`} style={{ animation: 'slideSwitch 0.3s ease-out' }}>
            <h2 className="text-[22px] font-bold mb-1">
              {resetToken ? 'Set a new password' : isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-neutral-600 text-sm mb-6">
              {resetToken ? 'Choose a strong password (8+ characters).' : isLogin ? 'Sign in to your workspace.' : 'Start automating in under a minute.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-5 px-3 py-2.5 rounded-lg border border-neutral-900 bg-neutral-950 flex items-start gap-2.5 text-sm text-red-400"
              style={{ animation: 'fadeUp 0.2s ease-out' }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} key={`form-${formKey}`}>
            <div className="space-y-3.5">
              {!isLogin && (
                <div className="field-enter" style={{ animationDelay: '0s' }}>
                  <label className="block text-[11px] font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Full Name</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700 group-focus-within:text-white transition-colors duration-200" />
                    <input
                      type="text" required={!isLogin} value={name}
                      onChange={(e) => setName(e.target.value)} disabled={lockoutTimer > 0}
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-900 rounded-lg text-white text-sm placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 disabled:opacity-40 transition-colors duration-200"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              {!resetToken && (
              <div className="field-enter" style={{ animationDelay: isLogin ? '0s' : '0.06s' }}>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700 group-focus-within:text-white transition-colors duration-200" />
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)} disabled={lockoutTimer > 0}
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-900 rounded-lg text-white text-sm placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 disabled:opacity-40 transition-colors duration-200"
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              )}

              <div className="field-enter" style={{ animationDelay: isLogin ? '0.06s' : '0.12s' }}>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-700 group-focus-within:text-white transition-colors duration-200" />
                  <input
                    type={showPassword ? 'text' : 'password'} required value={password}
                    onChange={(e) => setPassword(e.target.value)} disabled={lockoutTimer > 0}
                    className="w-full pl-9 pr-10 py-2.5 bg-neutral-950 border border-neutral-900 rounded-lg text-white text-sm placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 disabled:opacity-40 transition-colors duration-200"
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-700 hover:text-neutral-400 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Forgot password link — login only */}
            {isLogin && !resetToken && (
              <div className="mt-2 text-right">
                <button type="button" onClick={() => { setForgotOpen(true); setForgotSent(false); setForgotEmail(''); }} className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || lockoutTimer > 0}
              className={`w-full mt-5 flex items-center justify-center gap-2 py-2.5 font-semibold rounded-lg text-sm transition-all duration-200 focus:outline-none ${
                lockoutTimer > 0
                  ? 'bg-neutral-900 text-neutral-500 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-neutral-100 active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {resetToken ? 'Updating…' : 'Authenticating...'}</>
              ) : lockoutTimer > 0 ? (
                <>Wait {lockoutTimer}s</>
              ) : (
                <>{resetToken ? 'Set new password' : isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Divider + Google — hidden on reset-password route and when no client ID is configured */}
          {!resetToken && GOOGLE_ENABLED && (
            <>
          <div className="my-5 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-900" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-black text-neutral-700 text-[11px] font-medium uppercase tracking-wider">or</span>
            </div>
          </div>

          <div className="group relative w-full h-[44px]">
            {/* Custom membraneless button (visual) */}
            <div
              className="pointer-events-none absolute inset-0 w-full h-full flex items-center justify-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950 text-[13px] font-medium text-neutral-200 transition-all group-hover:border-neutral-600 group-hover:bg-neutral-900"
            >
              <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
            </div>
            {/* Real Google widget stacked invisibly on top — preserves the ID-token flow */}
            <div className="google-btn-wrapper absolute inset-0 w-full h-full opacity-[0.001] [&>div]:!w-full [&_iframe]:!w-full">
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

          {/* Footer */}
          <p className="mt-7 text-center text-[11px] text-neutral-800">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      {/* Email verification pending overlay */}
      {twoFactorToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <form onSubmit={handleTwoFactorSubmit}
            className="w-full max-w-[380px] mx-4 bg-neutral-950 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center text-center"
            style={{ animation: 'scaleIn 0.2s ease-out' }}>
            <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5">
              <ShieldCheck className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-[18px] font-bold text-white mb-2">Two-factor authentication</h2>
            <p className="text-[13px] text-neutral-400 leading-relaxed mb-6">
              Enter the 6-digit code from your authenticator app.
            </p>
            <input
              autoFocus
              value={twoFactorCode}
              onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              className="w-full text-center bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-[20px] tracking-[0.4em] font-mono text-white focus:outline-none focus:border-violet-500/50 placeholder:text-neutral-700 mb-4"
            />
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-[12px] mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading || twoFactorCode.length !== 6}
              className="w-full py-2.5 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mb-3"
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : <>Verify <ArrowRight className="w-4 h-4" /></>}
            </button>
            <button
              type="button"
              onClick={() => { setTwoFactorToken(''); setTwoFactorCode(''); setError(null); }}
              className="text-[12px] text-neutral-500 hover:text-white transition-colors"
            >
              Back to sign in
            </button>
          </form>
        </div>
      )}

      {verifyPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="w-full max-w-[380px] mx-4 bg-neutral-950 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center text-center"
            style={{ animation: 'scaleIn 0.2s ease-out' }}>
            <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5">
              <Mail className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-[18px] font-bold text-white mb-2">Check your email</h2>
            <p className="text-[13px] text-neutral-400 leading-relaxed mb-1">
              We sent a verification link to
            </p>
            <p className="text-[13px] font-semibold text-white mb-6 break-all">{verifyEmail}</p>
            <p className="text-[12px] text-neutral-600 mb-6 leading-relaxed">
              Click the link in the email to activate your account. The link expires in 24 hours.
            </p>

            {resendSent && (
              <div className="flex items-center gap-2 text-emerald-400 text-[12px] mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                New verification email sent!
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0}
              className="w-full py-2.5 rounded-lg border border-neutral-800 text-[13px] text-neutral-400 hover:text-white hover:border-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mb-3"
            >
              {resendLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend email'
              )}
            </button>

            <button
              onClick={() => { setVerifyPending(false); switchMode(true); }}
              className="text-[12px] text-neutral-700 hover:text-neutral-400 transition-colors"
            >
              Back to sign in
            </button>
          </div>
        </div>
      )}

      {/* Forgot password modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setForgotOpen(false)}>
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}
            style={{ animation: 'scaleIn 0.15s ease-out' }}>
            {forgotSent ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <p className="text-[14px] font-semibold text-white">Check your inbox</p>
                <p className="text-[12px] text-neutral-500 text-center">If an account exists for that email, we sent a reset link. It expires in 15 minutes.</p>
                <button onClick={() => setForgotOpen(false)} className="mt-2 text-[12px] text-neutral-500 hover:text-neutral-300 transition-colors">Close</button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                <div>
                  <p className="text-[15px] font-semibold text-white mb-1">Reset your password</p>
                  <p className="text-[12px] text-neutral-500">Enter your email and we'll send a reset link.</p>
                </div>
                <div className="flex items-center gap-2.5 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5">
                  <Mail className="w-4 h-4 text-neutral-600 shrink-0" />
                  <input
                    type="email" required autoFocus
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-transparent text-[13px] text-white placeholder:text-neutral-700 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForgotOpen(false)}
                    className="flex-1 py-2 rounded-lg border border-neutral-800 text-[13px] text-neutral-500 hover:text-neutral-300 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={forgotLoading}
                    className="flex-1 py-2 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-neutral-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reset password success overlay */}
      {resetDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            <p className="text-white text-[16px] font-semibold">Password updated!</p>
            <p className="text-neutral-500 text-[13px]">Redirecting to sign in…</p>
          </div>
        </div>
      )}
    </div>
  );
}
