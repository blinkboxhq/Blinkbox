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

/* ── Compact bar shown when user already has workflows ── */
function CompactBar({ onSubmit }) {
  const [busy, setBusy] = useState(false);
  const send = async (msg) => {
    if (!msg?.trim() || busy) return;
    setBusy(true);
    try { await onSubmit?.(msg); } finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-3 px-8 py-3 border-b border-[#111]">
      <div className="flex items-center gap-1.5 shrink-0">
        <img src={brianLogo} alt="Brian" className="w-4 h-4 object-contain opacity-80" />
        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Brian</span>
      </div>
      <div className="flex-1 max-w-[520px]">
        <AIPromptBox onSend={send} isLoading={busy} placeholder="Describe a new automation…" compact />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
        {CHIPS.map(s => (
          <button key={s} onClick={() => send(s)}
            className="text-[9px] px-2 py-1 rounded-full border border-[#1e1e1e] text-[#3a3a3a] hover:text-neutral-400 hover:border-[#2a2a2a] transition-all whitespace-nowrap">
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
    <div className="w-full flex flex-col items-center px-6 pt-14 pb-10 gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2 mb-1">
          <img src={brianLogo} alt="Brian" className="w-5 h-5 object-contain" />
          <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-widest">Brian AI</span>
        </div>
        <h1 className="text-[30px] font-bold text-white tracking-tight leading-tight">
          Hi {first}, what do you want<br />
          <span className="text-neutral-500">to automate today?</span>
        </h1>
      </div>

      <div className="w-full max-w-[580px]">
        <AIPromptBox onSend={send} isLoading={busy} placeholder="Describe an automation…" />
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        {CATS.map(({ icon: Icon, label, color }) => (
          <button key={label} onClick={() => send(`Build a ${label.toLowerCase()} automation`)}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#1e1e1e] bg-[#0a0a0a] hover:border-[#2a2a2a] hover:bg-[#111] transition-all">
            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
            <span className="text-[11px] font-medium text-neutral-500 group-hover:text-neutral-300 transition-colors">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {CHIPS.map(s => (
          <button key={s} onClick={() => send(s)}
            className="px-3 py-1.5 rounded-full text-[11px] text-neutral-700 border border-[#181818] hover:border-[#2a2a2a] hover:text-neutral-400 transition-all">
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
