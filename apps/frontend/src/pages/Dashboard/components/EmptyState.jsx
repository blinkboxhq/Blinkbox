import { Plus, Zap, Mail, Globe, Bot, GitBranch, TrendingUp } from 'lucide-react';

const TEMPLATES = [
  { icon: Mail,       color: 'text-blue-400',   bg: 'bg-blue-500/10',   label: 'Auto-reply Gmail leads',     desc: 'Classify incoming emails and draft AI replies' },
  { icon: Zap,        color: 'text-yellow-400',  bg: 'bg-yellow-500/10', label: 'Webhook → Slack alert',      desc: 'POST any event, get a Slack notification' },
  { icon: Globe,      color: 'text-emerald-400', bg: 'bg-emerald-500/10',label: 'Monitor prices daily',       desc: 'Scrape a URL, alert when price drops' },
  { icon: Bot,        color: 'text-violet-400',  bg: 'bg-violet-500/10', label: 'RSS → Notion digest',        desc: 'Extract and save articles to Notion daily' },
  { icon: TrendingUp, color: 'text-pink-400',    bg: 'bg-pink-500/10',   label: 'Stripe revenue to Slack',    desc: 'Post every payment to #revenue channel' },
  { icon: GitBranch,  color: 'text-amber-400',   bg: 'bg-amber-500/10',  label: 'GitHub PR summaries',        desc: 'Summarize PRs with AI, post to Slack' },
];

export default function EmptyState({ onDeploy, isSearch }) {
  if (isSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-900 flex items-center justify-center mb-4">
          <Plus className="w-4 h-4 text-neutral-600" />
        </div>
        <h3 className="text-sm font-semibold text-neutral-400 mb-1">No matching workflows</h3>
        <p className="text-xs text-neutral-600">Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="flex flex-col items-center text-center mb-10">
        <h3 className="text-[15px] font-semibold text-neutral-200 mb-2">Start your first automation</h3>
        <p className="text-[12px] text-neutral-600 max-w-sm mb-6 leading-relaxed">
          Describe it to Brian above, or pick a template to get started instantly.
        </p>
        <button
          onClick={onDeploy}
          className="flex items-center gap-1.5 px-4 py-2 bg-white text-black text-[12px] font-semibold rounded-lg hover:bg-neutral-200 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Blank Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((t) => (
          <div
            key={t.label}
            className="flex items-start gap-3 p-4 rounded-xl border border-[#1e1e20] bg-[#0d0d0f] hover:bg-[#111113] hover:border-[#2a2a2d] cursor-default transition-all duration-150 group"
          >
            <div className={`w-8 h-8 rounded-lg ${t.bg} flex items-center justify-center shrink-0 mt-0.5`}>
              <t.icon className={`w-4 h-4 ${t.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-neutral-300 group-hover:text-white transition-colors leading-tight mb-1">{t.label}</p>
              <p className="text-[11px] text-[#555] leading-relaxed">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-neutral-700 mt-6">
        Type any of these into Brian above to generate the full workflow automatically.
      </p>
    </div>
  );
}
