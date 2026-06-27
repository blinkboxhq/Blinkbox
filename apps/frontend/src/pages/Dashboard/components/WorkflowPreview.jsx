import { Zap, Globe, Clock, Mail, Hash, MessageSquare, GitBranch, Rss, ShoppingCart, CreditCard, Database } from 'lucide-react';

const TRIGGER_ICONS = {
  webhook:          Globe,
  cron_trigger:     Clock,
  gmail_trigger:    Mail,
  imap_trigger:     Mail,
  slack_trigger:    Hash,
  discord_trigger:  MessageSquare,
  github_trigger:   GitBranch,
  gitlab_trigger:   GitBranch,
  rss_trigger:      Rss,
  shopify_trigger:  ShoppingCart,
  stripe_trigger:   CreditCard,
  database_trigger: Database,
  telegram_trigger: MessageSquare,
  manual:           Zap,
};

export default function WorkflowPreview({ nodeCount = 0, trigger, accentColor = '#525252', lastRunStatus }) {
  const TriggerIcon = TRIGGER_ICONS[trigger] || Zap;
  const displayCount = Math.max(2, Math.min(nodeCount || 2, 7));
  const nodeBoxes = Array.from({ length: displayCount });

  const statusColor =
    lastRunStatus === 'executed' || lastRunStatus === 'completed' ? '#22c55e'
    : lastRunStatus === 'failed' ? '#ef4444'
    : lastRunStatus === 'running' ? '#f59e0b'
    : null;

  return (
    <div className="relative rounded-xl overflow-hidden"
      style={{
        height: 100,
        background: 'linear-gradient(180deg, var(--bb-surface-1) 0%, var(--bb-surface-0) 100%)',
        border: '1px solid var(--bb-border)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      }}>

      {/* Reflective top edge */}
      <div className="absolute top-0 left-[12%] right-[12%] h-px pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)',
      }} />

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, var(--bb-border-subtle) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }} />

      {/* Trigger color glow from left */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at -5% 50%, ${accentColor}26 0%, transparent 55%)`,
      }} />

      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0" style={{
        width: 3,
        background: accentColor,
        opacity: 0.85,
        borderRadius: '4px 0 0 4px',
      }} />

      {/* Node chain */}
      <div className="absolute inset-0 flex items-center px-6 gap-0">
        {nodeBoxes.map((_, i) => (
          <div key={i} className="flex items-center shrink-0">
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: i === 0 ? `${accentColor}22` : 'var(--bb-surface-2)',
              border: `1.5px solid ${i === 0 ? accentColor + '55' : 'var(--bb-border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: i === 0 ? `0 0 14px ${accentColor}18` : 'none',
              flexShrink: 0,
            }}>
              {i === 0
                ? <TriggerIcon style={{ width: 13, height: 13, color: accentColor, opacity: 0.95 }} />
                : <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--bb-border-strong)' }} />
              }
            </div>
            {i < nodeBoxes.length - 1 && (
              <div style={{
                width: 22,
                height: 1.5,
                background: i === 0
                  ? `linear-gradient(to right, ${accentColor}50, var(--bb-border))`
                  : 'var(--bb-border-subtle)',
                flexShrink: 0,
              }} />
            )}
          </div>
        ))}
        {nodeCount > 7 && (
          <span className="ml-2 text-[9px] font-mono shrink-0" style={{ color: '#282828' }}>+{nodeCount - 7}</span>
        )}
      </div>

      {/* Bottom-right meta */}
      <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
        {nodeCount > 0 && (
          <span className="text-[9px] font-mono" style={{ color: '#222' }}>{nodeCount}n</span>
        )}
        {statusColor && (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, opacity: 0.85, boxShadow: `0 0 6px ${statusColor}60` }} />
        )}
      </div>
    </div>
  );
}
