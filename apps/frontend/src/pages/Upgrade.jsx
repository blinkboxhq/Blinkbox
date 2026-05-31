import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Check, Zap, ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';
import logo from '../assets/logo.svg';

const FREE_FEATURES = [
  '5,000 executions / month',
  '10 active workflows',
  '50+ integrations',
  'Webhook & schedule triggers',
  'Community support',
];

const PRO_FEATURES = [
  'Unlimited executions',
  'Unlimited workflows',
  '250+ integrations',
  'AI agent builder',
  'Headless web scraping',
  'Priority support',
  'Advanced analytics',
  'Team collaboration',
];

export default function Upgrade() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingUsage, setFetchingUsage] = useState(true);

  const successMsg = searchParams.get('upgrade') === 'success';
  const cancelMsg  = searchParams.get('upgrade') === 'cancelled';

  useEffect(() => {
    api.get('/api/billing/usage')
      .then(r => setUsage(r.data))
      .catch(() => {})
      .finally(() => setFetchingUsage(false));
  }, []);

  useEffect(() => {
    if (successMsg) toast.success('You\'re now on Pro! 🎉');
    if (cancelMsg)  toast('Checkout cancelled — no changes made.');
  }, [successMsg, cancelMsg]);

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
        {/* Heading */}
        <div className="text-center mb-12">
          <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-widest mb-3">Plans</p>
          <h1 className="text-[36px] font-bold text-white tracking-tight leading-tight mb-3">
            {isPro ? 'You\'re on Pro' : 'Upgrade to Pro'}
          </h1>
          <p className="text-[15px] text-neutral-500 max-w-sm mx-auto">
            {isPro
              ? 'Manage your subscription or view your usage below.'
              : 'Unlock unlimited executions, workflows, and every integration.'}
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
            {/* Top shimmer line */}
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

        {/* Footer note */}
        {!isPro && (
          <p className="text-[11px] text-neutral-700 mt-6 text-center">
            Secure checkout via Stripe · Cancel anytime · No hidden fees
          </p>
        )}
      </div>
    </div>
  );
}
