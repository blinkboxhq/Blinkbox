import { Plus, Play, ArrowRight, Loader2, Terminal } from 'lucide-react';
import { STARTER_TEMPLATES } from '../starterTemplates';

// A first-time user's dashboard. The old version offered one button — "Blank
// workflow" — which led to a name box and then an empty canvas, and most people
// stopped there. Now the primary action is a starter workflow that runs with no
// credentials and shows real data on the first click of Run.
export default function EmptyState({ onDeploy, onUseTemplate, onConnectMCP, creatingTemplateId, isSearch }) {
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

  const busy = !!creatingTemplateId;

  return (
    <div className="py-8">
      <div className="flex flex-col items-center text-center mb-7">
        <h3 className="text-[15px] font-semibold text-[var(--bb-text-hi)] mb-2">See one run first</h3>
        <p className="text-[12px] text-[var(--bb-text-lo)] max-w-md leading-relaxed">
          Pick a starter. It opens ready to go — no accounts to connect — press <span className="text-[var(--bb-text-mid)] font-medium">Run</span> and
          you'll see real data in the last node. Then change one thing.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[980px] mx-auto">
        {STARTER_TEMPLATES.map((t) => {
          const isThis = creatingTemplateId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => !busy && onUseTemplate(t)}
              disabled={busy}
              className="bb-card text-left p-5 rounded-2xl flex flex-col gap-3 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed group"
              style={{ borderColor: isThis ? 'var(--bb-accent-ring)' : undefined }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-[13px] font-semibold text-[var(--bb-text-hi)] leading-snug">{t.name}</div>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--bb-accent-soft)', border: '1px solid var(--bb-accent-ring)', color: 'var(--bb-accent-hot)' }}
                >
                  {isThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                </div>
              </div>
              <p className="text-[11.5px] text-[var(--bb-text-lo)] leading-relaxed">{t.tagline}</p>
              <div className="flex items-center gap-1 flex-wrap mt-auto">
                {t.chain.map((step, i) => (
                  <span key={step} className="flex items-center gap-1">
                    <span className="text-[9.5px] font-mono text-[var(--bb-text-dim)] bg-white/[0.04] px-1.5 py-0.5 rounded">{step}</span>
                    {i < t.chain.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-[var(--bb-text-dim)]" />}
                  </span>
                ))}
              </div>
              <div className="text-[10.5px] font-medium" style={{ color: 'var(--bb-accent-hot)' }}>
                {isThis ? 'Opening…' : 'No setup · runs in seconds'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-6 mt-8 text-[12px]">
        <button
          onClick={onConnectMCP}
          disabled={busy}
          className="flex items-center gap-1.5 text-[var(--bb-text-mid)] hover:text-[var(--bb-text-hi)] transition-colors disabled:opacity-50"
        >
          <Terminal className="w-3.5 h-3.5" /> Let Claude Code build it over MCP
        </button>
        <span className="text-[var(--bb-text-dim)]">·</span>
        <button
          onClick={onDeploy}
          disabled={busy}
          className="flex items-center gap-1.5 text-[var(--bb-text-lo)] hover:text-[var(--bb-text-hi)] transition-colors disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" /> Blank workflow
        </button>
      </div>
    </div>
  );
}
