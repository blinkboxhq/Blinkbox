import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Mail, Clock, Database, GitBranch, Webhook,
  RefreshCw, ArrowRight,
} from 'lucide-react';
import { AIPromptBox } from '../../../components/ui/AIPromptBox';

const CATEGORIES = [
  { icon: Webhook,    label: 'Webhook',    color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'   },
  { icon: Mail,       label: 'Email',      color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'    },
  { icon: Clock,      label: 'Schedule',   color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'  },
  { icon: Globe,      label: 'Scraper',    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20'},
  { icon: GitBranch,  label: 'GitHub',     color: 'text-neutral-300', bg: 'bg-neutral-800/60', border: 'border-neutral-700/40'},
  { icon: Database,   label: 'Database',   color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20'   },
  { icon: RefreshCw,  label: 'Transform',  color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
];

const SUGGESTIONS = [
  'Auto-reply Gmail leads',
  'GitHub PR summaries to Slack',
  'Scrape prices daily and alert me',
  'Webhook → Notion database',
];

export default function DashboardHero({ onSubmit, isLoading, userName }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSend = async (msg) => {
    if (!msg?.trim() || submitting) return;
    setSubmitting(true);
    try { await onSubmit?.(msg); } finally { setSubmitting(false); }
  };

  const firstName = userName?.split(' ')[0] || 'there';

  return (
    <div className="w-full flex flex-col items-center px-6 pt-14 pb-10 gap-8">

      {/* Greeting */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-[28px] font-semibold text-white tracking-tight text-center"
      >
        Hi {firstName}, what do you want to automate?
      </motion.h1>

      {/* Prompt box */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="w-full max-w-[620px]"
      >
        <AIPromptBox
          onSend={handleSend}
          isLoading={isLoading || submitting}
          placeholder="Describe an automation…"
        />
      </motion.div>

      {/* Category tiles */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.14 }}
        className="flex items-center gap-2 flex-wrap justify-center max-w-[620px]"
      >
        {CATEGORIES.map(({ icon: Icon, label, color, bg, border }) => (
          <button
            key={label}
            onClick={() => handleSend(`Build a ${label.toLowerCase()} automation`)}
            className={`flex flex-col items-center gap-2 w-[78px] py-3 rounded-xl border ${bg} ${border} hover:brightness-110 transition-all group`}
          >
            <Icon className={`w-5 h-5 ${color}`} />
            <span className="text-[10px] font-medium text-neutral-400 group-hover:text-neutral-200 transition-colors">{label}</span>
          </button>
        ))}

        {/* More → */}
        <button
          onClick={() => handleSend('Show me all automation categories')}
          className="flex flex-col items-center gap-2 w-[78px] py-3 rounded-xl border border-[#1e1e1e] bg-transparent hover:border-neutral-700 transition-all group"
        >
          <ArrowRight className="w-5 h-5 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
          <span className="text-[10px] font-medium text-neutral-600 group-hover:text-neutral-400 transition-colors">More</span>
        </button>
      </motion.div>

      {/* Suggestion chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.22 }}
        className="flex flex-wrap justify-center gap-2 max-w-[560px]"
      >
        <span className="text-[11px] text-neutral-600 mr-1 self-center">Try:</span>
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => handleSend(s)}
            className="px-3 py-1.5 rounded-full text-[11px] text-neutral-500 border border-[#1e1e1e] hover:border-neutral-700 hover:text-neutral-300 bg-transparent transition-all"
          >
            {s}
          </button>
        ))}
      </motion.div>

    </div>
  );
}
