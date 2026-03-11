import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
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
  const navigate = useNavigate();

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
    setIsLoading(true);
    setError(null);
    const endpoint = isLogin ? '/login' : '/register';
    const payload = isLogin ? { email, password } : { name, email, password };
    try {
      const response = await api.post(`/api/auth${endpoint}`, payload);
      localStorage.setItem('blinkbox_token', response.data.token);
      localStorage.setItem('blinkbox_user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.lockoutTimer) setLockoutTimer(err.response.data.lockoutTimer);
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
        .google-btn-wrapper > div { width: 100% !important; }
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

          <h1 className="text-3xl font-black tracking-[0.2em] mb-2">BLINKBOX</h1>
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
            <img src={logo} alt="BlinkBox" className="w-6 h-6 object-contain" />
            <span className="text-sm font-bold tracking-[0.15em]">BLINKBOX</span>
          </Link>

          {/* Mode toggle — clean pill */}
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

          {/* Heading — switches with animation */}
          <div key={`heading-${formKey}`} style={{ animation: 'slideSwitch 0.3s ease-out' }}>
            <h2 className="text-[22px] font-bold mb-1">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-neutral-600 text-sm mb-6">
              {isLogin ? 'Sign in to your workspace.' : 'Start automating in under a minute.'}
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
            {isLogin && (
              <div className="mt-2 text-right">
                <button type="button" className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors">
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
                <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</>
              ) : lockoutTimer > 0 ? (
                <>Wait {lockoutTimer}s</>
              ) : (
                <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-900" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-black text-neutral-700 text-[11px] font-medium uppercase tracking-wider">or</span>
            </div>
          </div>

          {/* Google */}
          <div className="google-btn-wrapper flex justify-center rounded-lg overflow-hidden">
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

          {/* Footer */}
          <p className="mt-7 text-center text-[11px] text-neutral-800">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
