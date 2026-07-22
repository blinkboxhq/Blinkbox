import { useState, useCallback } from 'react';
import { Check, X, ChevronRight, Zap, Globe, Code2, Mail,
  GitBranch, Database, Cpu, Clock, Box, Link, Pencil, ChevronUp, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CredentialPicker from '../../../components/ui/CredentialPicker';

// ── Credential metadata — backendType → picker config ─────────────────────────
const CRED_META = {
  // AI model nodes
  agent_anthropic:                   { label: 'Anthropic API Key',       credentialType: 'api_key',  hint: 'sk-ant-...' },
  agent_openai:                      { label: 'OpenAI API Key',          credentialType: 'api_key',  hint: 'sk-...' },
  agent_gemini:                      { label: 'Google AI Key',           credentialType: 'api_key',  hint: 'AI Studio key' },

  // Agent integrations — Google
  agent_integration_gmail:           { label: 'Gmail',                   credentialType: 'oauth',    oauthProvider: 'google',    accentColor: 'red' },
  agent_integration_google_sheets:   { label: 'Google Sheets',           credentialType: 'oauth',    oauthProvider: 'google',    accentColor: 'green' },
  agent_integration_google_calendar: { label: 'Google Calendar',         credentialType: 'oauth',    oauthProvider: 'google',    accentColor: 'blue' },
  agent_integration_google_drive:    { label: 'Google Drive',            credentialType: 'oauth',    oauthProvider: 'google',    accentColor: 'amber' },

  // Agent integrations — OAuth
  agent_integration_github:          { label: 'GitHub',                  credentialType: 'oauth',    oauthProvider: 'github',    accentColor: 'zinc' },
  agent_integration_slack:           { label: 'Slack',                   credentialType: 'oauth',    oauthProvider: 'slack',     accentColor: 'pink' },
  agent_integration_notion:          { label: 'Notion',                  credentialType: 'api_key',  hint: 'secret_...',         accentColor: 'zinc' },
  agent_integration_airtable:        { label: 'Airtable',                credentialType: 'api_key',  hint: 'pat...',             accentColor: 'red' },
  agent_integration_discord:         { label: 'Discord Bot Token',       credentialType: 'api_key',  hint: 'bot token',          accentColor: 'indigo' },
  agent_integration_telegram:        { label: 'Telegram Bot Token',      credentialType: 'api_key',  hint: 'bot token',          accentColor: 'blue' },
  agent_integration_outlook:         { label: 'Outlook',                 credentialType: 'oauth',    oauthProvider: 'microsoft', accentColor: 'blue' },

  // Agent integrations — API key
  agent_integration_linear:          { label: 'Linear API Key',          credentialType: 'api_key',  hint: 'lin_api_...' },
  agent_integration_hubspot:         { label: 'HubSpot API Key',         credentialType: 'api_key',  hint: 'pat-...' },
  agent_integration_jira:            { label: 'Jira API Token',          credentialType: 'api_key',  hint: 'API token' },
  agent_integration_asana:           { label: 'Asana API Key',           credentialType: 'api_key',  hint: 'access token' },
  agent_integration_shopify:         { label: 'Shopify API Key',         credentialType: 'api_key',  hint: 'access token' },
  agent_integration_clickup:         { label: 'ClickUp API Key',         credentialType: 'api_key',  hint: 'pk_...' },
  agent_integration_twilio:          { label: 'Twilio Credential',       credentialType: 'api_key',  hint: 'sid:token' },
  agent_integration_mongodb:         { label: 'MongoDB URI',             credentialType: 'api_key',  hint: 'mongodb+srv://...' },
  agent_integration_postgres:        { label: 'PostgreSQL URI',          credentialType: 'api_key',  hint: 'postgresql://...' },
  agent_integration_redis:           { label: 'Redis URL',               credentialType: 'api_key',  hint: 'redis://...' },
  // Agent memory
  agent_memory_supabase:             { label: 'Supabase (Memory)',       credentialType: 'api_key',  hint: 'service_role key' },
  agent_memory_pinecone:             { label: 'Pinecone API Key',        credentialType: 'api_key',  hint: 'pc-...' },
  agent_memory_postgres:             { label: 'PostgreSQL Memory URI',   credentialType: 'api_key',  hint: 'postgresql://...' },
  agent_memory_redis:                { label: 'Redis Memory URL',        credentialType: 'api_key',  hint: 'redis://...' },

  // Direct service nodes — Google
  gmail:                             { label: 'Gmail',                   credentialType: 'oauth',    oauthProvider: 'google',    accentColor: 'red' },
  gmail_trigger:                     { label: 'Gmail',                   credentialType: 'oauth',    oauthProvider: 'google',    accentColor: 'red' },
  google_sheets:                     { label: 'Google Sheets',           credentialType: 'oauth',    oauthProvider: 'google',    accentColor: 'green' },
  google_calendar:                   { label: 'Google Calendar',         credentialType: 'oauth',    oauthProvider: 'google',    accentColor: 'blue' },
  google_calendar_trigger:           { label: 'Google Calendar',         credentialType: 'oauth',    oauthProvider: 'google',    accentColor: 'blue' },
  google_drive:                      { label: 'Google Drive',            credentialType: 'oauth',    oauthProvider: 'google',    accentColor: 'amber' },

  // Direct service nodes — OAuth
  slack:                             { label: 'Slack',                   credentialType: 'oauth',    oauthProvider: 'slack',     accentColor: 'pink' },
  slack_trigger:                     { label: 'Slack',                   credentialType: 'oauth',    oauthProvider: 'slack',     accentColor: 'pink' },
  github:                            { label: 'GitHub',                  credentialType: 'api_key',  hint: 'ghp_...',            accentColor: 'zinc' },
  github_trigger:                    { label: 'GitHub',                  credentialType: 'oauth',    oauthProvider: 'github',    accentColor: 'zinc' },
  notion:                            { label: 'Notion',                  credentialType: 'api_key',  hint: 'secret_...',         accentColor: 'zinc' },
  notion_trigger:                    { label: 'Notion',                  credentialType: 'api_key',  hint: 'secret_...',         accentColor: 'zinc' },
  airtable:                          { label: 'Airtable',                credentialType: 'api_key',  hint: 'pat...',             accentColor: 'red' },
  airtable_trigger:                  { label: 'Airtable',                credentialType: 'api_key',  hint: 'pat...',             accentColor: 'red' },

  // Direct service nodes — API key
  hubspot:                           { label: 'HubSpot',                 credentialType: 'api_key',  hint: 'pat-...',            accentColor: 'orange' },
  hubspot_trigger:                   { label: 'HubSpot',                 credentialType: 'api_key',  hint: 'pat-...',            accentColor: 'orange' },
  stripe:                            { label: 'Stripe',                  credentialType: 'api_key',  hint: 'sk_live_...',        accentColor: 'indigo' },
  stripe_trigger:                    { label: 'Stripe',                  credentialType: 'api_key',  hint: 'whsec_...',          accentColor: 'indigo' },
  linear:                            { label: 'Linear',                  credentialType: 'api_key',  hint: 'lin_api_...',        accentColor: 'indigo' },
  linear_trigger:                    { label: 'Linear',                  credentialType: 'api_key',  hint: 'lin_api_...',        accentColor: 'indigo' },
  sendgrid:                          { label: 'SendGrid',                credentialType: 'api_key',  hint: 'SG...',              accentColor: 'blue' },
  twilio:                            { label: 'Twilio',                  credentialType: 'api_key',  hint: 'auth token',         accentColor: 'red' },
  openai:                            { label: 'OpenAI',                  credentialType: 'api_key',  hint: 'sk-...' },
  anthropic:                         { label: 'Anthropic',               credentialType: 'api_key',  hint: 'sk-ant-...' },
  telegram:                          { label: 'Telegram Bot Token',      credentialType: 'api_key',  hint: 'bot token' },
  discord:                           { label: 'Discord Bot Token',       credentialType: 'api_key',  hint: 'bot token',          accentColor: 'indigo' },
  telegram_trigger:                  { label: 'Telegram Bot Token',      credentialType: 'api_key',  hint: 'bot token' },
  discord_trigger:                   { label: 'Discord Bot Token',       credentialType: 'api_key',  hint: 'bot token',          accentColor: 'indigo' },
};

// ── Node icon map ─────────────────────────────────────────────────────────────
const ICONS = {
  webhook: Globe, manual: Zap, cron_trigger: Clock, http_request: Globe,
  code: Code2, gmail: Mail, gmail_trigger: Mail, slack: Link, slack_trigger: Link,
  condition: GitBranch, data_mapper: Database, ai_agent: Cpu,
};
function NodeIcon({ type }) {
  const Icon = ICONS[type] || Box;
  return <Icon className="w-3.5 h-3.5" />;
}

function roleForNode(node) {
  const bt = node.data?.backendType || node.backendType || '';
  if (node.data?.type === 'trigger' || bt.endsWith('_trigger') || bt === 'manual' || bt === 'webhook') return 'Trigger';
  if (bt === 'ai_agent') return 'Agent';
  if (bt.startsWith('agent_memory_')) return 'Memory';
  if (bt.startsWith('agent_integration_')) return 'Integrations';
  if (bt.startsWith('agent_')) return 'Model';
  return 'Steps';
}

function hasNodeCredential(node, credAssignments) {
  return Boolean(credAssignments[node.id] || node.data?.config?.credentialId);
}

function PlanSummary({ nodes, edges, flow, credNodes, assignedCount, configComplete }) {
  const groups = ['Trigger', 'Agent', 'Model', 'Memory', 'Integrations', 'Steps']
    .map(label => ({ label, count: nodes.filter(n => roleForNode(n) === label).length }))
    .filter(g => g.count > 0);
  const issueCount = (flow.errors?.length || 0) + (flow.warnings?.length || 0);
  return (
    <div className="px-3 py-2 border-b border-[#2a2a2a] bg-neutral-950/35">
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        {[
          { label: 'Nodes', value: nodes.length },
          { label: 'Edges', value: edges.length },
          { label: 'Credentials', value: `${assignedCount}/${credNodes.length}` },
          { label: 'Config', value: configComplete ? 'complete' : 'locked' },
          { label: 'Checks', value: issueCount ? `${issueCount} issue${issueCount === 1 ? '' : 's'}` : 'clean' },
        ].map(item => (
          <div key={item.label} className="rounded-lg border border-[#252525] bg-neutral-900/50 px-2 py-1.5">
            <p className="text-[9px] text-neutral-600 uppercase tracking-wider">{item.label}</p>
            <p className="text-[12px] font-bold text-neutral-200">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {groups.map(group => (
          <span key={group.label} className="px-2 py-1 rounded-md border border-[#2a2a2a] bg-neutral-900 text-[10px] text-neutral-400">
            {group.label}: <span className="text-neutral-200 font-semibold">{group.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Modify plan input ─────────────────────────────────────────────────────────
function ModifyInput({ onModify }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

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
  const [accepted,       setAccepted]       = useState(false);
  const [dismissed,      setDismissed]      = useState(false);
  const [expanded,       setExpanded]       = useState(true);
  const [credAssignments, setCredAssignments] = useState({});

  if (dismissed) return null;
  if (!flow) return (
    <div className="text-[12px] text-neutral-300 leading-relaxed whitespace-pre-wrap">{text}</div>
  );

  const { nodes = [], edges = [] } = flow;
  const structuralErrors = flow.errors || [];
  const warnings = flow.warnings || [];

  const credNodes = nodes.filter(n => {
    const bt = n.data?.backendType || n.backendType || '';
    return !!CRED_META[bt];
  });
  const missingCredNodes = credNodes.filter(n => !hasNodeCredential(n, credAssignments));
  const assignedCount = credNodes.length - missingCredNodes.length;
  const configComplete = structuralErrors.length === 0 && warnings.length === 0 && missingCredNodes.length === 0;
  const applyDisabled = !configComplete;

  const accept = () => {
    setAccepted(true);
    const mergedFlow = {
      ...flow,
      nodes: flow.nodes.map(n => {
        const assigned = credAssignments[n.id];
        if (!assigned) return n;
        return {
          ...n,
          data: { ...n.data, config: { ...(n.data?.config || {}), credentialId: assigned } },
        };
      }),
    };
    onAccept(mergedFlow);
  };

  const dismiss = () => { setDismissed(true); onDismiss?.(); };

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
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-500 shrink-0" />
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest flex-1">Agent Build Plan</span>
          <span className="text-[10px] font-mono text-neutral-600 shrink-0">{nodes.length} nodes · {edges.length} edges</span>
          {expanded
            ? <ChevronUp className="w-3 h-3 text-neutral-700 shrink-0" />
            : <ChevronRight className="w-3 h-3 text-neutral-700 shrink-0" />}
        </button>

        <PlanSummary nodes={nodes} edges={edges} flow={flow} credNodes={credNodes} assignedCount={assignedCount} configComplete={configComplete} />

        {(structuralErrors.length > 0 || warnings.length > 0) && (
          <div className={`mx-3 mt-2 px-2.5 py-2 rounded-lg border ${structuralErrors.length ? 'border-red-500/25 bg-red-500/8' : 'border-amber-500/20 bg-amber-500/8'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${structuralErrors.length ? 'text-red-400' : 'text-amber-400'}`}>
              {structuralErrors.length ? 'Structural errors' : 'Warnings'}
            </p>
            {[...structuralErrors, ...warnings].slice(0, 4).map(issue => (
              <p key={issue} className="text-[10px] text-neutral-500 leading-relaxed">• {issue}</p>
            ))}
          </div>
        )}

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
                  const meta      = CRED_META[bt];
                  const isLast    = i === nodes.length - 1;

                  return (
                    <div key={node.id}>
                      <div className="flex items-start gap-2.5 py-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5
                          ${isTrigger ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-500'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <NodeIcon type={bt} />
                            <span className="text-[12px] font-medium text-neutral-200 truncate">
                              {node.data?.label || bt}
                            </span>
                            <span className="text-[9px] font-mono text-neutral-600 bg-neutral-800 px-1.5 py-0.5 rounded shrink-0">
                              {bt}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${isTrigger ? 'text-amber-400/80 bg-amber-500/10' : 'text-neutral-500 bg-neutral-800/80'}`}>
                              {roleForNode(node).toLowerCase()}
                            </span>
                          </div>

                          {meta && !accepted && (
                            <div className="mt-2 pl-0.5">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Required credential</span>
                                <span className={`text-[9px] ${credAssignments[node.id] ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {credAssignments[node.id] ? 'ready' : 'missing'}
                                </span>
                              </div>
                              <CredentialPicker
                                value={credAssignments[node.id] || ''}
                                onChange={credId => setCredAssignments(prev => ({ ...prev, [node.id]: credId }))}
                                label={meta.label}
                                placeholder="Select or create credential…"
                                credentialType={meta.credentialType}
                                oauthProvider={meta.oauthProvider}
                                accentColor={meta.accentColor || 'zinc'}
                                hint={meta.hint}
                              />
                            </div>
                          )}

                          {meta && accepted && credAssignments[node.id] && (
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-400">
                              <Check className="w-3 h-3" /> Credential assigned
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
          <div className="mx-3 mb-2 px-2.5 py-2 bg-neutral-900 border border-[#2a2a2a] rounded-lg flex items-start gap-2">
            <KeyRound className="w-3 h-3 text-neutral-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              {missingCredNodes.length > 0
                ? `${missingCredNodes.length} credential${missingCredNodes.length > 1 ? 's are' : ' is'} required before this can be added to the canvas.`
                : 'Credentials are ready. Brian can apply this once validation is clean.'}
            </p>
          </div>
        )}

        {!configComplete && !accepted && (
          <div className="mx-3 mb-2 px-2.5 py-2 rounded-lg border border-amber-500/15 bg-amber-500/5">
            <p className="text-[10px] text-amber-400/80 leading-relaxed">
              Complete credentials and clear configuration warnings before adding this workflow to the canvas.
            </p>
          </div>
        )}

        {/* ── Actions ── */}
        {!accepted ? (
          <div className="flex flex-col gap-2 px-3 py-2.5 border-t border-[#2a2a2a] bg-neutral-900/30">
            <div className="flex items-center gap-2">
              <button onClick={accept} disabled={applyDisabled}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white hover:bg-neutral-100 text-neutral-950 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Check className="w-3.5 h-3.5" /> {applyDisabled ? 'Complete Config First' : 'Apply to Canvas'}
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
