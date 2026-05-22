import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Mail, Clock, Database, GitBranch, Webhook, RefreshCw, Sparkles } from 'lucide-react';
import { AIPromptBox } from '../../../components/ui/AIPromptBox';

const CATS = [
  { icon: Webhook,   label: 'Webhook',   color: '#3b82f6' },
  { icon: Mail,      label: 'Email',     color: '#ef4444' },
  { icon: Clock,     label: 'Schedule',  color: '#f59e0b' },
  { icon: Globe,     label: 'Scraper',   color: '#10b981' },
  { icon: GitBranch, label: 'GitHub',    color: '#a3a3a3' },
  { icon: Database,  label: 'Database',  color: '#06b6d4' },
  { icon: RefreshCw, label: 'Transform', color: '#8b5cf6' },
];

const CHIPS = [
  'Webhook → Slack alert',
  'Auto-reply Gmail leads',
  'Scrape & send daily digest',
  'GitHub PR summary to Slack',
];

export default function DashboardHero({ onSubmit, isLoading, userName }) {
  const [busy, setBusy] = useState(false);

  const send = async (msg) => {
    if (!msg?.trim() || busy) return;
    setBusy(true);
    try { await onSubmit?.(msg); } finally { setBusy(false); }
  };

  const first = userName?.split(' ')[0] || 'there';

  return (
    <div className="w-full flex flex-col items-center px-6 pt-16 pb-12 gap-7">

      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-widest">Brian AI</span>
        </div>
        <h1 className="text-[32px] font-bold text-white tracking-tight leading-none">
          Hi {first}, what do you want<br />
          <span className="text-neutral-500">to automate today?</span>
        </h1>
      </motion.div>

      {/* Prompt */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}
        className="w-full max-w-[600px]">
        <AIPromptBox onSend={send} isLoading={isLoading || busy} placeholder="Describe an automation…" />
      </motion.div>

      {/* Category tiles */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.16 }}
        className="flex items-center gap-2 flex-wrap justify-center">
        {CATS.map(({ icon: Icon, label, color }) => (
          <button key={label} onClick={() => send(`Build a ${label.toLowerCase()} automation`)}
            className="group flex items-center gap-2 px-3 py-2 rounded-xl border border-[#1e1e1e] bg-[#0a0a0a] hover:border-[#2a2a2a] hover:bg-[#111] transition-all duration-150">
            <Icon className="w-3.5 h-3.5 shrink-0 transition-colors" style={{ color }} />
            <span className="text-[11px] font-medium text-neutral-500 group-hover:text-neutral-300 transition-colors">{label}</span>
          </button>
        ))}
      </motion.div>

      {/* Suggestion chips */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: 0.24 }}
        className="flex flex-wrap justify-center gap-1.5">
        {CHIPS.map(s => (
          <button key={s} onClick={() => send(s)}
            className="px-3 py-1.5 rounded-full text-[11px] text-neutral-700 border border-[#181818] hover:border-[#2a2a2a] hover:text-neutral-400 bg-transparent transition-all">
            {s}
          </button>
        ))}
      </motion.div>
    </div>
  );
}
