import { useState } from 'react';
import { Globe, Mail, Clock, Database, GitBranch, Webhook, RefreshCw, Sparkles } from 'lucide-react';
import { AIPromptBox } from '../../../components/ui/AIPromptBox';
import brianLogo from '../../../assets/brian.webp';

const CHIPS = [
  'Webhook → Slack alert',
  'Auto-reply Gmail leads',
  'Scrape & send daily digest',
  'GitHub PR → Notion summary',
];

const CATS = [
  { icon: Webhook,   label: 'Webhook',   color: '#3b82f6' },
  { icon: Mail,      label: 'Email',     color: '#ef4444' },
  { icon: Clock,     label: 'Schedule',  color: '#f59e0b' },
  { icon: Globe,     label: 'Scraper',   color: '#10b981' },
  { icon: GitBranch, label: 'GitHub',    color: '#a3a3a3' },
  { icon: Database,  label: 'Database',  color: '#06b6d4' },
  { icon: RefreshCw, label: 'Transform', color: '#8b5cf6' },
];

const ComingSoonOverlay = ({ compact }) => (
  <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ backdropFilter: 'blur(2px)', background: 'rgba(8,8,8,0.7)' }}>
    <div className={`flex items-center gap-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-full px-4 ${compact ? 'py-1.5' : 'py-2'}`}>
      <Sparkles className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-violet-400 shrink-0`} />
      <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-semibold text-neutral-300 tracking-wide`}>Coming soon</span>
    </div>
  </div>
);

/* ── Compact bar shown when user already has workflows ── */
function CompactBar({ onSubmit }) {
  const [busy, setBusy] = useState(false);
  const send = async (msg) => {
    if (!msg?.trim() || busy) return;
    setBusy(true);
    try { await onSubmit?.(msg); } finally { setBusy(false); }
  };

  return (
    <div className="relative flex items-center gap-3 px-8 py-3 border-b border-[#111]">
      <ComingSoonOverlay compact />
      <div className="flex items-center gap-1.5 shrink-0 pointer-events-none select-none opacity-30">
        <img src={brianLogo} alt="Brian" className="w-4 h-4 object-contain" />
        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Brian</span>
      </div>
      <div className="flex-1 max-w-[520px] pointer-events-none select-none opacity-30">
        <AIPromptBox onSend={send} isLoading={busy} placeholder="Describe a new automation…" compact />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap shrink-0 pointer-events-none select-none opacity-30">
        {CHIPS.map(s => (
          <button key={s}
            className="text-[9px] px-2 py-1 rounded-full border border-[#1e1e1e] text-[#3a3a3a] whitespace-nowrap">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Full hero shown on empty state / first visit ── */
function FullHero({ onSubmit, userName }) {
  const [busy, setBusy] = useState(false);
  const send = async (msg) => {
    if (!msg?.trim() || busy) return;
    setBusy(true);
    try { await onSubmit?.(msg); } finally { setBusy(false); }
  };
  const first = userName?.split(' ')[0] || 'there';

  return (
    <div className="relative w-full flex flex-col items-center px-6 pt-14 pb-10 gap-6">
      <ComingSoonOverlay compact={false} />
      <div className="flex flex-col items-center gap-2 text-center pointer-events-none select-none opacity-30">
        <div className="flex items-center gap-2 mb-1">
          <img src={brianLogo} alt="Brian" className="w-5 h-5 object-contain" />
          <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-widest">Brian AI</span>
        </div>
        <h1 className="text-[30px] font-bold text-white tracking-tight leading-tight">
          Hi {first}, what do you want<br />
          <span className="text-neutral-500">to automate today?</span>
        </h1>
      </div>

      <div className="w-full max-w-[580px] pointer-events-none select-none opacity-30">
        <AIPromptBox onSend={send} isLoading={busy} placeholder="Describe an automation…" />
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center pointer-events-none select-none opacity-30">
        {CATS.map(({ icon: Icon, label, color }) => (
          <button key={label}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#1e1e1e] bg-[#0a0a0a]">
            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
            <span className="text-[11px] font-medium text-neutral-500">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-1.5 pointer-events-none select-none opacity-30">
        {CHIPS.map(s => (
          <button key={s}
            className="px-3 py-1.5 rounded-full text-[11px] text-neutral-700 border border-[#181818]">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardHero({ onSubmit, userName, compact = false }) {
  return compact
    ? <CompactBar onSubmit={onSubmit} />
    : <FullHero onSubmit={onSubmit} userName={userName} />;
}
