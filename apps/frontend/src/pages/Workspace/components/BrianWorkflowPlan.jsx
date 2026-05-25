import { useState, useCallback } from 'react';
import { Check, X, ChevronRight, AlertTriangle, Zap, Globe, Code2, Mail, GitBranch,
  Database, Cpu, Clock, Box, Link, Shield, KeyRound, ExternalLink, Pencil, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import api from '../../../lib/api';

// ── Which nodes need OAuth vs API key ─────────────────────────────────────────
const OAUTH_NODES = {
  slack:                    { provider: 'slack',    label: 'Slack' },
  slack_trigger:            { provider: 'slack',    label: 'Slack' },
  gmail:                    { provider: 'google',   label: 'Gmail' },
  gmail_trigger:            { provider: 'google',   label: 'Gmail' },
  google_sheets:            { provider: 'google',   label: 'Google Sheets' },
  google_calendar:          { provider: 'google',   label: 'Google Calendar' },
  google_calendar_trigger:  { provider: 'google',   label: 'Google Calendar' },
  google_drive:             { provider: 'google',   label: 'Google Drive' },
  airtable:                 { provider: 'airtable', label: 'Airtable' },
  airtable_trigger:         { provider: 'airtable', label: 'Airtable' },
  notion:                   { provider: 'notion',   label: 'Notion' },
  notion_trigger:           { provider: 'notion',   label: 'Notion' },
};

const API_KEY_NODES = new Set([
  'openai', 'anthropic', 'gemini', 'deepseek', 'groq', 'perplexity',
  'twilio', 'sendgrid', 'resend', 'telegram', 'discord', 'whatsapp',
  'stripe', 'shopify', 'hubspot', 'github', 'jira', 'linear',
  'mongodb', 'postgres', 'redis', 'firebase', 'supabase', 'pinecone',
  'elevenlabs', 'twitter', 'web_search', 'zoom',
  'shopify_trigger', 'stripe_trigger', 'linear_trigger', 'github_trigger',
  'discord_trigger', 'telegram_trigger',
]);

// ── Node icon map ─────────────────────────────────────────────────────────────
const ICONS = {
  webhook: Globe, manual: Zap, cron_trigger: Clock, http_request: Globe,
  code: Code2, gmail: Mail, gmail_trigger: Mail, slack: Link, slack_trigger: Link,
  logic_router: GitBranch, data_mapper: Database, ai_agent: Cpu,
};
function NodeIcon({ type }) {
  const Icon = ICONS[type] || Box;
  return <Icon className="w-3.5 h-3.5" />;
}

// ── Inline OAuth connect ──────────────────────────────────────────────────────
function OAuthPrompt({ provider, label, onConnected }) {
  const [connecting, setConnecting] = useState(false);
  const [done, setDone]             = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const connect = useCallback(() => {
    setConnecting(true);
    const token = localStorage.getItem('blinkbox_token');
    const popup = window.open(
      `${API_URL}/api/oauth/${provider}/authorize?token=${token}`,
      'blinkbox_oauth', 'width=600,height=700'
    );
    const handler = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== 'blinkbox:oauth') return;
      window.removeEventListener('message', handler);
      setConnecting(false);
      if (e.data.success) { setDone(true); onConnected?.(e.data.credential); }
    };
    window.addEventListener('message', handler);
    const poll = setInterval(() => {
      if (popup?.closed) { clearInterval(poll); setConnecting(false); window.removeEventListener('message', handler); }
    }, 500);
  }, [provider, API_URL, onConnected]);

  if (done) return (
    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mt-1">
      <Check className="w-3 h-3" /> {label} connected
    </div>
  );
  return (
    <button onClick={connect} disabled={connecting}
      className="flex items-center gap-1.5 text-[10px] text-violet-400 hover:text-violet-300 mt-1 transition-colors disabled:opacity-50">
      <ExternalLink className="w-3 h-3" />
      {connecting ? `Connecting ${label}…` : `Connect ${label} →`}
    </button>
  );
}

// ── Inline API key credential ─────────────────────────────────────────────────
function ApiKeyPrompt({ nodeLabel, onSaved }) {
  const [open, setOpen]     = useState(false);
  const [name, setName]     = useState(`${nodeLabel} key`);
  const [secret, setSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);

  const save = async () => {
    if (!secret.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post('/api/credentials', {
        name: name.trim(), type: 'api_key', secret: secret.trim(),
      });
      setDone(true);
      onSaved?.(data.credential);
    } catch { toast.error('Failed to save credential'); }
    setSaving(false);
  };

  if (done) return (
    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mt-1">
      <Check className="w-3 h-3" /> Credential saved
    </div>
  );
  return (
    <div className="mt-1">
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-[10px] text-violet-400 hover:text-violet-300 transition-colors">
          <KeyRound className="w-3 h-3" /> Add API key →
        </button>
      ) : (
        <div className="mt-1.5 space-y-1.5 bg-neutral-900 border border-[#2a2a2a] rounded-lg p-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Credential name"
            className="w-full bg-neutral-950 border border-[#333] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-neutral-600 placeholder-neutral-700" />
          <input type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="API key / secret"
            className="w-full bg-neutral-950 border border-[#333] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-neutral-600 placeholder-neutral-700" />
          <div className="flex gap-1.5">
            <button onClick={save} disabled={saving || !secret.trim()}
              className="flex-1 flex items-center justify-center gap-1 py-1 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-semibold rounded transition-colors disabled:opacity-40">
              <Shield className="w-3 h-3" /> {saving ? 'Saving…' : 'Encrypt & Save'}
            </button>
            <button onClick={() => setOpen(false)} className="px-2 py-1 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modify plan input ─────────────────────────────────────────────────────────
function ModifyInput({ onModify }) {
  const [open, setOpen]     = useState(false);
  const [text, setText]     = useState('');

  const submit = () => {
    if (!text.trim()) return;
    onModify(text.trim());
    setText('');
    setOpen(false);
  };

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors">
          <Pencil className="w-2.5 h-2.5" /> Modify plan
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-1.5 space-y-1.5"
        >
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false); }}
            placeholder="e.g. add error handling, use Slack instead of email…"
            className="w-full bg-neutral-950 border border-[#333] rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-neutral-600 placeholder-neutral-700"
          />
          <div className="flex gap-1.5">
            <button onClick={submit} disabled={!text.trim()}
              className="flex-1 py-1 bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-semibold rounded-lg transition-colors disabled:opacity-40">
              Apply change
            </button>
            <button onClick={() => setOpen(false)} className="px-2.5 text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors">
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Main plan card ─────────────────────────────────────────────────────────────
export default function BrianWorkflowPlan({ text, flow, onAccept, onDismiss, onModify }) {
  const [accepted,  setAccepted]  = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded,  setExpanded]  = useState(true);

  if (dismissed) return null;
  if (!flow) return (
    <div className="text-[12px] text-neutral-300 leading-relaxed whitespace-pre-wrap">{text}</div>
  );

  const { nodes = [], edges = [] } = flow;

  const accept = () => { setAccepted(true); onAccept(flow); };
  const dismiss = () => { setDismissed(true); onDismiss?.(); };

  const credNodes = nodes.filter(n => {
    const bt = n.data?.backendType || n.backendType || '';
    return OAUTH_NODES[bt] || API_KEY_NODES.has(bt);
  });

  return (
    <div className="flex flex-col gap-2">
      {text && (
        <p className="text-[12px] text-neutral-400 leading-relaxed">{text}</p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="border border-[#2a2a2a] rounded-xl overflow-hidden bg-neutral-900/40"
      >
        {/* ── Header ── */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 border-b border-[#2a2a2a] bg-neutral-900/60 hover:bg-neutral-900 transition-colors text-left"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest flex-1">Workflow Plan</span>
          <span className="text-[10px] font-mono text-neutral-600 shrink-0">{nodes.length} nodes · {edges.length} edges</span>
          {expanded ? <ChevronUp className="w-3 h-3 text-neutral-700 shrink-0" /> : <ChevronRight className="w-3 h-3 text-neutral-700 shrink-0" />}
        </button>

        {/* ── Node list ── */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="px-3 py-2 space-y-0">
                {nodes.map((node, i) => {
                  const bt        = node.data?.backendType || node.backendType || '';
                  const isTrigger = node.data?.type === 'trigger' || bt.endsWith('_trigger') || bt === 'manual' || bt === 'webhook';
                  const oauthInfo = OAUTH_NODES[bt];
                  const needsApiKey = API_KEY_NODES.has(bt);
                  const needsCred   = oauthInfo || needsApiKey;
                  const isLast      = i === nodes.length - 1;

                  return (
                    <div key={node.id}>
                      <div className="flex items-start gap-2.5 py-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5
                          ${isTrigger ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-500'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <NodeIcon type={bt} />
                            <span className="text-[12px] font-medium text-neutral-200 truncate">
                              {node.data?.label || bt}
                            </span>
                            <span className="text-[9px] font-mono text-neutral-600 bg-neutral-800 px-1.5 py-0.5 rounded shrink-0">
                              {bt}
                            </span>
                            {isTrigger && (
                              <span className="text-[9px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">trigger</span>
                            )}
                          </div>
                          {needsCred && !accepted && (
                            <div className="mt-1 flex items-start gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="text-[10px] text-amber-400/80">Needs credentials</span>
                                {oauthInfo ? (
                                  <OAuthPrompt provider={oauthInfo.provider} label={oauthInfo.label} />
                                ) : (
                                  <ApiKeyPrompt nodeLabel={node.data?.label || bt} />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {!isLast && (
                        <div className="ml-[18px] flex items-center gap-1 py-0.5">
                          <div className="w-px h-3 bg-neutral-800 ml-[1.5px]" />
                          <ChevronRight className="w-2.5 h-2.5 text-neutral-700 -ml-px -mt-0.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Credential summary banner ── */}
        {credNodes.length > 0 && !accepted && (
          <div className="mx-3 mb-2 px-2.5 py-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
            <p className="text-[10px] text-amber-400/70 leading-relaxed">
              {credNodes.length} node{credNodes.length > 1 ? 's' : ''} need credentials — connect them above before running.
            </p>
          </div>
        )}

        {/* ── Actions ── */}
        {!accepted ? (
          <div className="flex flex-col gap-2 px-3 py-2.5 border-t border-[#2a2a2a] bg-neutral-900/30">
            <div className="flex items-center gap-2">
              <button onClick={accept}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white hover:bg-neutral-100 text-neutral-950 rounded-lg text-[11px] font-bold transition-colors">
                <Check className="w-3.5 h-3.5" /> Apply to Canvas
              </button>
              <button onClick={dismiss}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-[#333] text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 rounded-lg text-[11px] font-semibold transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {onModify && (
              <ModifyInput onModify={onModify} />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 border-t border-[#2a2a2a]">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-emerald-400 font-medium">Applied to canvas</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
