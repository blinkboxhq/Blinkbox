import { useState, useEffect, useRef } from 'react';
import {
  X, ArrowRight, Zap, Globe, Bot, Webhook, GitBranch,
  Timer, Database, Search, Mail, MessageSquare, Loader2,
  ChevronRight, Sparkles, Code2, Bell, Play,
} from 'lucide-react';

// ── Trigger catalog ────────────────────────────────────────────────────────
const TRIGGERS = [
  {
    key: 'webhook',
    label: 'Webhook',
    desc: 'Fires when an HTTP request hits your unique URL',
    icon: Webhook,
    color: '#6366F1',
    badge: 'Real-time',
  },
  {
    key: 'cron_trigger',
    label: 'Schedule',
    desc: 'Runs on a time-based schedule (cron or interval)',
    icon: Timer,
    color: '#F59E0B',
    badge: 'Scheduled',
  },
  {
    key: 'manual',
    label: 'Manual',
    desc: 'Trigger by clicking Run in the workspace',
    icon: Play,
    color: '#10B981',
    badge: 'On demand',
  },
  {
    key: 'gmail_trigger',
    label: 'Gmail',
    desc: 'Fires when a matching email arrives in your inbox',
    icon: Mail,
    color: '#EA4335',
    badge: 'Email',
  },
  {
    key: 'telegram_trigger',
    label: 'Telegram',
    desc: 'Fires when your bot receives a message',
    icon: MessageSquare,
    color: '#229ED9',
    badge: 'Messaging',
  },
  {
    key: 'http_request',
    label: 'HTTP Poll',
    desc: 'Polls an external API endpoint on a schedule',
    icon: Globe,
    color: '#06B6D4',
    badge: 'Polling',
  },
  {
    key: 'airtable_trigger',
    label: 'Airtable',
    desc: 'Fires when a record changes in your Airtable base',
    icon: Database,
    color: '#FFBF00',
    badge: 'Database',
  },
  {
    key: 'slack_trigger',
    label: 'Slack',
    desc: 'Fires on Slack messages, reactions, or events',
    icon: MessageSquare,
    color: '#4A154B',
    badge: 'Messaging',
  },
  {
    key: 'github_trigger',
    label: 'GitHub',
    desc: 'Fires on push, PR, or issue events',
    icon: Code2,
    color: '#fff',
    badge: 'Dev',
  },
  {
    key: 'discord_trigger',
    label: 'Discord',
    desc: 'Fires on Discord server events or messages',
    icon: Bell,
    color: '#5865F2',
    badge: 'Messaging',
  },
  {
    key: 'ai_agent',
    label: 'AI Chat',
    desc: 'Triggered by a conversational AI chat session',
    icon: Bot,
    color: '#A78BFA',
    badge: 'AI',
  },
  {
    key: 'logic_router',
    label: 'Condition',
    desc: 'Starts with a conditional branching logic block',
    icon: GitBranch,
    color: '#F97316',
    badge: 'Logic',
  },
];

// ── Template catalog ────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'lead-enrichment',
    name: 'Lead Enrichment Pipeline',
    desc: 'Webhook → AI enriches lead data → Slack notification',
    category: 'Sales',
    accent: '#6366F1',
    nodes: ['webhook', 'ai_agent', 'slack'],
    scaffold: {
      nodes: [
        { id: 'n1', type: 'webhook', description: 'Webhook Trigger', data: { isActive: true }, position: { x: 100, y: 300 } },
        { id: 'n2', type: 'ai_agent', description: 'Enrich Lead', data: { prompt: 'Enrich this lead data and return a JSON summary: {{n1.body}}' }, position: { x: 400, y: 300 } },
        { id: 'n3', type: 'slack', description: 'Notify Sales', data: { message: 'New lead enriched: {{n2.response}}' }, position: { x: 700, y: 300 } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', type: 'onSuccess', conditionPath: '' },
        { id: 'e2-3', source: 'n2', target: 'n3', type: 'onSuccess', conditionPath: '' },
      ],
      entryNodeId: 'n1',
      trigger: 'webhook',
    },
  },
  {
    id: 'price-monitor',
    name: 'Competitor Price Monitor',
    desc: 'Schedule → Scrape pricing page → AI analyzes → Slack alert',
    category: 'Research',
    accent: '#F59E0B',
    nodes: ['cron_trigger', 'web_scraper', 'ai_agent', 'slack'],
    scaffold: {
      nodes: [
        { id: 'n1', type: 'cron_trigger', description: 'Daily Schedule', data: {}, position: { x: 100, y: 300 } },
        { id: 'n2', type: 'web_scraper', description: 'Scrape Prices', data: { source: 'https://competitor.com/pricing', particularThing: 'Find all pricing tiers' }, position: { x: 400, y: 300 } },
        { id: 'n3', type: 'ai_agent', description: 'Analyze Changes', data: { prompt: 'Compare pricing and highlight anomalies:\n{{n2.content}}' }, position: { x: 700, y: 300 } },
        { id: 'n4', type: 'slack', description: 'Alert Team', data: { message: 'Price update: {{n3.response}}' }, position: { x: 1000, y: 300 } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', type: 'onSuccess', conditionPath: '' },
        { id: 'e2-3', source: 'n2', target: 'n3', type: 'onSuccess', conditionPath: '' },
        { id: 'e3-4', source: 'n3', target: 'n4', type: 'onSuccess', conditionPath: '' },
      ],
      entryNodeId: 'n1',
      trigger: 'cron_trigger',
    },
  },
  {
    id: 'form-to-api',
    name: 'Form Submission Handler',
    desc: 'Webhook → Map fields → POST to your API',
    category: 'Data',
    accent: '#10B981',
    nodes: ['webhook', 'data_mapper', 'http_request'],
    scaffold: {
      nodes: [
        { id: 'n1', type: 'webhook', description: 'Form Webhook', data: { isActive: true }, position: { x: 100, y: 300 } },
        { id: 'n2', type: 'data_mapper', description: 'Map Fields', data: { mode: 'set', items: [{ key1: 'name', key2: '{{n1.body.name}}' }, { key1: 'email', key2: '{{n1.body.email}}' }] }, position: { x: 400, y: 300 } },
        { id: 'n3', type: 'http_request', description: 'Submit to API', data: { method: 'POST', url: 'https://api.example.com/submissions' }, position: { x: 700, y: 300 } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', type: 'onSuccess', conditionPath: '' },
        { id: 'e2-3', source: 'n2', target: 'n3', type: 'onSuccess', conditionPath: '' },
      ],
      entryNodeId: 'n1',
      trigger: 'webhook',
    },
  },
  {
    id: 'daily-digest',
    name: 'Daily AI Summary',
    desc: 'Schedule → Fetch metrics → AI summarizes → Discord digest',
    category: 'Reporting',
    accent: '#A78BFA',
    nodes: ['cron_trigger', 'http_request', 'ai_agent', 'discord'],
    scaffold: {
      nodes: [
        { id: 'n1', type: 'cron_trigger', description: 'Run Daily', data: {}, position: { x: 100, y: 300 } },
        { id: 'n2', type: 'http_request', description: 'Fetch Metrics', data: { method: 'GET', url: 'https://api.example.com/metrics' }, position: { x: 400, y: 300 } },
        { id: 'n3', type: 'ai_agent', description: 'Summarize', data: { prompt: 'Write a concise daily digest:\n{{n2.data}}' }, position: { x: 700, y: 300 } },
        { id: 'n4', type: 'discord', description: 'Post Digest', data: { message: '{{n3.response}}' }, position: { x: 1000, y: 300 } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', type: 'onSuccess', conditionPath: '' },
        { id: 'e2-3', source: 'n2', target: 'n3', type: 'onSuccess', conditionPath: '' },
        { id: 'e3-4', source: 'n3', target: 'n4', type: 'onSuccess', conditionPath: '' },
      ],
      entryNodeId: 'n1',
      trigger: 'cron_trigger',
    },
  },
];

const NODE_LABELS = {
  webhook: 'Webhook', cron_trigger: 'Schedule', manual: 'Manual',
  ai_agent: 'AI Agent', web_scraper: 'Scraper', http_request: 'HTTP',
  data_mapper: 'Mapper', slack: 'Slack', discord: 'Discord',
  logic_router: 'Router', delay: 'Delay', loop: 'Loop',
};

// ── Step indicator ────────────────────────────────────────────────────────
function StepDot({ num, active, done, label }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
        done ? 'bg-white text-black' : active ? 'bg-white/10 text-white ring-2 ring-white/30' : 'bg-white/[0.04] text-neutral-700'
      }`}>
        {done ? '✓' : num}
      </div>
      <span className={`text-[10px] font-medium tracking-wide transition-colors ${active ? 'text-white' : 'text-neutral-700'}`}>{label}</span>
    </div>
  );
}

function StepLine({ done }) {
  return (
    <div className="flex-1 h-px mt-[-10px] mx-1 relative overflow-hidden">
      <div className="absolute inset-0 bg-neutral-800" />
      <div className={`absolute inset-0 bg-white/40 transition-transform duration-500 origin-left ${done ? 'scale-x-100' : 'scale-x-0'}`} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function CreateAutomationBox({ isOpen, onClose, onCreate, onCreateTemplate, isLoading }) {
  const [step, setStep] = useState(1); // 1=name+trigger, 2=template-or-blank confirm
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [triggerSearch, setTriggerSearch] = useState('');
  const [mode, setMode] = useState('blank'); // 'blank' | 'template'
  const nameRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1); setName(''); setDescription('');
      setSelectedTrigger(null); setSelectedTemplate(null);
      setTriggerSearch(''); setMode('blank');
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTriggers = TRIGGERS.filter(
    (t) =>
      t.label.toLowerCase().includes(triggerSearch.toLowerCase()) ||
      t.desc.toLowerCase().includes(triggerSearch.toLowerCase())
  );

  const canAdvance = name.trim().length > 0 && (mode === 'template' ? !!selectedTemplate : !!selectedTrigger);

  const handleSubmit = async () => {
    if (!canAdvance || isLoading) return;
    if (mode === 'template' && selectedTemplate) {
      await onCreateTemplate(selectedTemplate.id, name.trim(), description.trim());
    } else {
      await onCreate({ name: name.trim(), description: description.trim(), trigger: selectedTrigger?.key || 'manual' });
    }
  };

  const selectTemplate = (t) => {
    setSelectedTemplate(t);
    setSelectedTrigger(TRIGGERS.find((tr) => tr.key === t.scaffold.trigger) || TRIGGERS[2]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', animation: 'cabFadeIn 0.18s ease-out' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-[760px] bg-[#0A0A0A] border border-neutral-800/70 rounded-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh', animation: 'cabSlideUp 0.2s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* ── Top bar ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[14px] font-semibold text-white tracking-tight">New Automation</span>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1">
            <StepDot num={1} active={step === 1} done={step > 1} label="Setup" />
            <StepLine done={step > 1} />
            <StepDot num={2} active={step === 2} done={false} label="Launch" />
          </div>

          <button onClick={onClose} disabled={isLoading} className="text-neutral-600 hover:text-white transition-colors p-1 rounded-md hover:bg-white/[0.06]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {step === 1 && (
            <div className="p-6 space-y-6" style={{ animation: 'cabFadeIn 0.15s ease-out' }}>

              {/* Name + description */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2">Automation Name *</label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && canAdvance && setStep(2)}
                    placeholder="e.g. Lead Enrichment Pipeline"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2">Description <span className="text-neutral-700 normal-case">(optional)</span></label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this automation do?"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                </div>
              </div>

              {/* Mode toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setMode('blank'); setSelectedTemplate(null); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold border transition-all ${
                    mode === 'blank'
                      ? 'bg-white/[0.08] border-white/20 text-white'
                      : 'border-neutral-800 text-neutral-600 hover:text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" /> Start from scratch
                </button>
                <button
                  onClick={() => setMode('template')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold border transition-all ${
                    mode === 'template'
                      ? 'bg-white/[0.08] border-white/20 text-white'
                      : 'border-neutral-800 text-neutral-600 hover:text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Use a template
                </button>
              </div>

              {/* ── BLANK MODE: trigger grid ── */}
              {mode === 'blank' && (
                <div style={{ animation: 'cabFadeIn 0.12s ease-out' }}>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Choose a trigger</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-700" />
                      <input
                        type="text"
                        value={triggerSearch}
                        onChange={(e) => setTriggerSearch(e.target.value)}
                        placeholder="Search triggers..."
                        className="pl-7 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-[11px] text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-700 transition-colors w-44"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {filteredTriggers.map((trigger) => {
                      const active = selectedTrigger?.key === trigger.key;
                      const Icon = trigger.icon;
                      return (
                        <button
                          key={trigger.key}
                          onClick={() => setSelectedTrigger(trigger)}
                          className={`relative text-left p-3.5 rounded-xl border transition-all duration-150 group ${
                            active
                              ? 'border-white/25 bg-white/[0.06]'
                              : 'border-neutral-800/60 hover:border-neutral-700 hover:bg-white/[0.02]'
                          }`}
                        >
                          {active && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                              <span className="text-[8px] text-black font-bold">✓</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: `${trigger.color}18`, border: `1px solid ${trigger.color}30` }}
                            >
                              <Icon className="w-3.5 h-3.5" style={{ color: trigger.color }} />
                            </div>
                            <span className="text-[12px] font-semibold text-neutral-200">{trigger.label}</span>
                          </div>
                          <p className="text-[10px] text-neutral-600 leading-relaxed line-clamp-2">{trigger.desc}</p>
                          <span
                            className="inline-block mt-2 text-[9px] font-medium px-1.5 py-0.5 rounded"
                            style={{ background: `${trigger.color}15`, color: trigger.color }}
                          >
                            {trigger.badge}
                          </span>
                        </button>
                      );
                    })}
                    {filteredTriggers.length === 0 && (
                      <div className="col-span-3 py-8 text-center text-neutral-700 text-[12px]">No triggers match "{triggerSearch}"</div>
                    )}
                  </div>
                </div>
              )}

              {/* ── TEMPLATE MODE ── */}
              {mode === 'template' && (
                <div style={{ animation: 'cabFadeIn 0.12s ease-out' }}>
                  <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-3">Pick a template</label>
                  <div className="grid grid-cols-2 gap-3">
                    {TEMPLATES.map((t) => {
                      const active = selectedTemplate?.id === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => selectTemplate(t)}
                          className={`relative text-left p-4 rounded-xl border transition-all duration-150 ${
                            active
                              ? 'border-white/25 bg-white/[0.05]'
                              : 'border-neutral-800/60 hover:border-neutral-700 hover:bg-white/[0.02]'
                          }`}
                        >
                          {active && (
                            <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                              <span className="text-[8px] text-black font-bold">✓</span>
                            </div>
                          )}
                          <div
                            className="text-[9px] font-semibold uppercase tracking-widest mb-2 px-1.5 py-0.5 rounded inline-block"
                            style={{ background: `${t.accent}20`, color: t.accent }}
                          >
                            {t.category}
                          </div>
                          <h4 className="text-[13px] font-semibold text-neutral-200 mb-1">{t.name}</h4>
                          <p className="text-[11px] text-neutral-600 leading-relaxed mb-3">{t.desc}</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            {t.nodes.map((n, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <span className="text-[9px] font-mono text-neutral-600 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
                                  {NODE_LABELS[n] || n}
                                </span>
                                {i < t.nodes.length - 1 && <ArrowRight className="w-2 h-2 text-neutral-700" />}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Confirm ── */}
          {step === 2 && (
            <div className="p-6" style={{ animation: 'cabFadeIn 0.15s ease-out' }}>
              <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto mb-4">
                    {mode === 'template' && selectedTemplate ? (
                      <Sparkles className="w-6 h-6 text-white" />
                    ) : selectedTrigger ? (
                      <selectedTrigger.icon className="w-6 h-6" style={{ color: selectedTrigger?.color || '#fff' }} />
                    ) : (
                      <Zap className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <h3 className="text-[18px] font-bold text-white mb-1.5">{name}</h3>
                  {description && <p className="text-[12px] text-neutral-500">{description}</p>}
                </div>

                <div className="space-y-2 mb-8">
                  <SummaryRow label="Trigger" value={selectedTrigger?.label || '—'} accent={selectedTrigger?.color} />
                  <SummaryRow label="Mode" value={mode === 'template' ? `Template — ${selectedTemplate?.name}` : 'Blank canvas'} />
                  {mode === 'template' && selectedTemplate && (
                    <SummaryRow label="Nodes" value={`${selectedTemplate.nodes.length} pre-built nodes`} />
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-white text-black text-[14px] font-bold hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Building automation...</>
                    : <><Zap className="w-4 h-4" /> Launch Automation</>
                  }
                </button>

                <button
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="w-full mt-3 py-2 text-[12px] text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  ← Back to setup
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800/60 shrink-0 bg-[#0A0A0A]">
            <p className="text-[11px] text-neutral-700">
              {canAdvance
                ? mode === 'template' && selectedTemplate
                  ? `Ready — ${selectedTemplate.nodes.length} nodes will be pre-loaded`
                  : selectedTrigger
                    ? `Ready — starts with ${selectedTrigger.label} trigger`
                    : 'Pick a trigger to continue'
                : 'Enter a name to continue'}
            </p>
            <button
              onClick={() => setStep(2)}
              disabled={!canAdvance}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-[13px] font-bold hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Continue <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes cabFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cabSlideUp { from { opacity: 0; transform: translateY(16px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

function SummaryRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-neutral-900 border border-neutral-800/60">
      <span className="text-[11px] font-medium text-neutral-600 uppercase tracking-wider">{label}</span>
      <span
        className="text-[12px] font-semibold"
        style={{ color: accent || '#e5e5e5' }}
      >
        {value}
      </span>
    </div>
  );
}
