import { useState } from 'react';
import { motion } from 'framer-motion';
import { AIPromptBox } from '../../../components/ui/AIPromptBox';
import brianLogo from '../../../assets/brian.webp';

const SUGGESTIONS = [
  { label: 'Webhook → Slack alert',    hint: 'Trigger a Slack message on every POST' },
  { label: 'Auto-reply Gmail leads',   hint: 'Respond to new Gmail threads automatically' },
  { label: 'Scrape & email digest',    hint: 'Scrape a site daily and send a summary email' },
  { label: 'GitHub PR summaries',      hint: 'Post a PR summary to Slack on every merge' },
];

export default function DashboardHero({ onSubmit, isLoading = false }) {
  const [submitted, setSubmitted] = useState(false);

  const handleSend = async (message, files) => {
    if (!message?.trim()) return;
    setSubmitted(true);
    await onSubmit?.(message, files);
    setSubmitted(false);
  };

  return (
    <div className="w-full flex flex-col items-center gap-5 pt-10 pb-8">

      {/* Brand lockup */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="flex items-center gap-2.5">
          <img src={brianLogo} alt="Brian" className="w-8 h-8 rounded-xl object-contain opacity-90" />
          <span className="text-[22px] font-semibold text-white tracking-tight">Brian</span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-violet-400/80 border border-violet-400/20 bg-violet-400/[0.07] px-2 py-0.5 rounded-full">
            AI
          </span>
        </div>
        <p className="text-[13px] text-neutral-500 text-center max-w-[360px] leading-relaxed">
          Describe what you want to automate — Brian will build the workflow.
        </p>
      </motion.div>

      {/* Prompt box */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="w-full max-w-[640px]"
      >
        <AIPromptBox onSend={handleSend} isLoading={isLoading || submitted} />
      </motion.div>

      {/* Suggestion chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="flex flex-wrap justify-center gap-2 max-w-[640px]"
      >
        {SUGGESTIONS.map(({ label, hint }) => (
          <button
            key={label}
            title={hint}
            onClick={() => handleSend(label)}
            className="px-3 py-1.5 rounded-full text-[11px] text-neutral-600 border border-[#1e1e1e] hover:border-neutral-700 hover:text-neutral-400 bg-transparent transition-all"
          >
            {label}
          </button>
        ))}
      </motion.div>

    </div>
  );
}
