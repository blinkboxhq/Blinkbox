import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Check, Zap, ArrowLeft, Sparkles, Loader2, X, PartyPopper } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';
import logo from '../assets/logo.svg';

const FREE_FEATURES = [
  '5,000 executions / month',
  '10 active workflows',
  'Webhook & schedule triggers',
  'Community support',
];

const PRO_FEATURES = [
  'Unlimited executions',
  'Unlimited workflows',
  'AI agent builder',
  'Headless web scraping',
  'Team collaboration',
  'Advanced analytics',
  'Priority support',
];

function SuccessModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" style={{ animation: 'fadeIn 0.15s ease-out' }}>
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-[400px] mx-4 p-8 flex flex-col items-center text-center" style={{ animation: 'scaleIn 0.15s ease-out' }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-600 hover:text-neutral-300 transition-colors">
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative"
          style={{ background: 'linear-gradient(135deg,#7c3aed22,#4f46e522)', border: '1px solid #7c3aed44' }}>
          <PartyPopper className="w-7 h-7 text-violet-400" />
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </div>
        </div>

        <h2 className="text-[22px] font-bold text-white mb-2 tracking-tight">You're on Pro!</h2>
        <p className="text-[13px] text-neutral-500 mb-7 leading-relaxed">
          Your workspace has been upgraded. All Pro features are now active.
        </p>

        {/* What you unlocked */}
        <div className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 mb-6 text-left">
          <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-3">What you unlocked</p>
          <div className="flex flex-col gap-2">
            {PRO_FEATURES.map(f => (
              <div key={f} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-violet-400" strokeWidth={3} />
                </div>
                <span className="text-[12px] text-neutral-300">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full h-10 rounded-xl text-[13px] font-semibold text-black transition-all duration-200 hover:opacity-90"
          style={{ background: '#fff' }}
        >
          Start building
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
      `}</style>
    </div>
  );
}

export default function Upgrade() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingUsage, setFetchingUsage] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const isSuccess   = searchParams.get('upgrade') === 'success';
  const isCancelled = searchParams.get('upgrade') === 'cancelled';

  useEffect(() => {
    api.get('/api/billing/usage')
      .then(r => setUsage(r.data))
      .catch(() => {})
      .finally(() => setFetchingUsage(false));
  }, []);

  useEffect(() => {
    if (isSuccess) setShowSuccess(true);
    if (isCancelled) toast('Checkout cancelled — no changes made.');
  }, [isSuccess, isCancelled]);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/billing/checkout');
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Could not start checkout. Try again.');
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/billing/portal');
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Could not open billing portal.');
      setLoading(false);
    }
  };

  const isPro = usage?.plan === 'pro';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080808' }}>
      {showSuccess && <SuccessModal onClose={() => { setShowSuccess(false); navigate('/dashboard'); }} />}

      {/* Nav */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-[#1a1a1a] shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <img src={logo} alt="Blinkbox" className="w-5 h-5 object-contain" />
          <span className="text-[13px] font-semibold tracking-[0.05em] text-white">Blinkbox</span>
        </Link>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to dashboard
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-widest mb-3">Plans</p>
          <h1 className="text-[36px] font-bold text-white tracking-tight leading-tight mb-3">
            {isPro ? "You're on Pro" : 'Upgrade to Pro'}
          </h1>
          <p className="text-[15px] text-neutral-500 max-w-sm mx-auto">
            {isPro
              ? 'Manage your subscription or view your usage below.'
              : 'Unlock unlimited executions, workflows, and every feature.'}
          </p>
        </div>

        {/* Current usage pill */}
        {!fetchingUsage && usage && (
          <div className="flex items-center gap-2 mb-10 px-4 py-2 rounded-full border border-[#222] bg-[#0f0f0f]">
            <div className={`w-2 h-2 rounded-full shrink-0 ${isPro ? 'bg-violet-400' : 'bg-neutral-600'}`} />
            <span className="text-[12px] text-neutral-400">
              Current plan: <span className="text-white font-semibold capitalize">{usage.plan}</span>
              {!isPro && (
                <span className="text-neutral-600"> · {usage.creditsUsed.toLocaleString()} / {usage.monthlyLimit.toLocaleString()} credits used</span>
              )}
            </span>
          </div>
        )}

        {/* Plan cards */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">

          {/* Free */}
          <div className="flex-1 flex flex-col p-6 rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d]">
            <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-4">Free</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[32px] font-bold text-white">$0</span>
              <span className="text-[13px] text-neutral-600">/ month</span>
            </div>
            <p className="text-[13px] text-neutral-600 mb-6">For solo builders and side projects.</p>
            <ul className="flex flex-col gap-2.5 flex-1 mb-8">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-[13px] text-neutral-500">
                  <Check className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="h-10 rounded-xl border border-[#222] flex items-center justify-center text-[13px] font-semibold text-neutral-700">
              {!isPro ? 'Current plan' : 'Free tier'}
            </div>
          </div>

          {/* Pro */}
          <div className="flex-1 flex flex-col p-6 rounded-2xl border relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.15)' }}>
            <div className="absolute top-0 left-6 right-6 h-px"
              style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)' }} />

            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Pro</p>
              {isPro && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5" /> Active
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[32px] font-bold text-white">$29</span>
              <span className="text-[13px] text-neutral-500">/ month</span>
            </div>
            <p className="text-[13px] text-neutral-500 mb-6">For teams serious about automation.</p>
            <ul className="flex flex-col gap-2.5 flex-1 mb-8">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-[13px] text-neutral-300">
                  <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {isPro ? (
              <button
                onClick={handleManage}
                disabled={loading}
                className="h-10 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-all duration-200 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? 'Opening…' : 'Manage subscription'}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="h-10 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60"
                style={{ background: loading ? '#333' : '#fff', color: '#000' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-neutral-500" /> : <Zap className="w-4 h-4" />}
                {loading ? 'Redirecting to Stripe…' : 'Upgrade to Pro — $29/mo'}
              </button>
            )}
          </div>
        </div>

        {!isPro && (
          <p className="text-[11px] text-neutral-700 mt-6 text-center">
            Secure checkout via Stripe · Cancel anytime · No hidden fees
          </p>
        )}
      </div>
    </div>
  );
}
