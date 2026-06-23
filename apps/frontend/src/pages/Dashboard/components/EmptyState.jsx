import { Plus, Zap, Mail, Globe, Bot, GitBranch, TrendingUp, ArrowRight } from 'lucide-react';

const TEMPLATES = [
  { icon: Mail,       color: 'text-blue-400',    bg: 'bg-blue-500/10',    label: 'Auto-reply Gmail leads',  desc: 'Classify incoming emails and draft AI replies',  prompt: 'When I get a new Gmail lead, classify it with AI and draft a reply' },
  { icon: Zap,        color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  label: 'Webhook → Slack alert',   desc: 'POST any event, get a Slack notification',        prompt: 'When a webhook fires, post a formatted message to Slack' },
  { icon: Globe,      color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Monitor prices daily',    desc: 'Scrape a URL, alert when price drops',            prompt: 'Scrape a product page daily and alert me when the price drops' },
  { icon: Bot,        color: 'text-violet-400',  bg: 'bg-violet-500/10',  label: 'RSS → Notion digest',     desc: 'Extract and save articles to Notion daily',       prompt: 'Every morning, pull my RSS feeds and save new articles to Notion' },
  { icon: TrendingUp, color: 'text-pink-400',    bg: 'bg-pink-500/10',    label: 'Stripe revenue to Slack', desc: 'Post every payment to #revenue channel',          prompt: 'On every successful Stripe charge, post the amount to a Slack channel' },
  { icon: GitBranch,  color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'GitHub PR summaries',     desc: 'Summarize PRs with AI, post to Slack',            prompt: 'Summarize each merged GitHub PR with AI and post it to Slack' },
];

export default function EmptyState({ onDeploy, isSearch, onPickTemplate }) {
  if (isSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-10 h-10 rounded-xl bb-card flex items-center justify-center mb-4">
          <Plus className="w-4 h-4 text-[var(--bb-text-lo)]" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--bb-text-mid)] mb-1">No matching workflows</h3>
        <p className="text-xs text-[var(--bb-text-lo)]">Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-col items-center text-center mb-9">
        <h3 className="text-[15px] font-semibold text-[var(--bb-text-hi)] mb-2">Start your first automation</h3>
        <p className="text-[12px] text-[var(--bb-text-lo)] max-w-sm mb-6 leading-relaxed">
          Pick a template and Brian builds it instantly, or start from a blank canvas.
        </p>
        <button onClick={onDeploy} className="bb-btn bb-btn-primary flex items-center gap-1.5 px-4 py-2 text-[12px]">
          <Plus className="w-3.5 h-3.5" /> Blank workflow
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((t, i) => (
          <button
            key={t.label}
            onClick={() => onPickTemplate?.(t.prompt)}
            className="bb-card bb-card-hover bb-rise group flex items-start gap-3 p-4 text-left"
            style={{ '--bb-i': i }}
          >
            <div className={`w-8 h-8 rounded-lg ${t.bg} flex items-center justify-center shrink-0 mt-0.5`}>
              <t.icon className={`w-4 h-4 ${t.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-[var(--bb-text-mid)] group-hover:text-white transition-colors leading-tight mb-1">{t.label}</p>
              <p className="text-[11px] text-[var(--bb-text-dim)] leading-relaxed">{t.desc}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[var(--bb-text-dim)] opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
