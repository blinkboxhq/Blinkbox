import { useState } from 'react';
import { MessageSquare, Copy, Check, Bot, Lock } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '@/lib/api';

export default function ChatTriggerNode({ config = {}, updateConfig, nodeId }) {
  const { id: automationId } = useParams();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('setup');

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const systemPrompt = config.systemPrompt || '';
  const sessionIdField = config.sessionIdField || 'sessionId';
  const authEnabled = config.authEnabled ?? false;

  const copy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const examplePayload = `{
  "message": "What's the weather?",
  "${sessionIdField}": "user_abc123"
}`;

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#222] rounded-md border border-[#333]">
            <MessageSquare className="w-3 h-3 text-pink-400" />
          </div>
          <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Chat Trigger</span>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">↔ bottom panel</span>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'prompt', 'security'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-pink-500 text-pink-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">

        {activeTab === 'setup' && (
          <>
            {/* URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Endpoint URL</label>
              <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
                <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
                <button onClick={copy} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
                  {copied ? <Check className="w-3 h-3 text-pink-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Session ID field name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Session ID Field</label>
              <input
                value={sessionIdField}
                onChange={(e) => updateConfig?.('sessionIdField', e.target.value)}
                placeholder="sessionId"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-pink-500/50 transition-colors placeholder:text-zinc-700"
              />
              <p className="text-[9px] text-zinc-600 leading-relaxed">
                Used to group messages from the same user into a conversation thread.
              </p>
            </div>

            {/* Expected payload */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Expected Payload</label>
              <pre className="text-[9px] font-mono text-zinc-500 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-2.5 leading-relaxed whitespace-pre-wrap">
                {examplePayload}
              </pre>
            </div>

            {/* Available variables */}
            <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Available in workflow as</span>
              {['$trigger.body.message', `$trigger.body.${sessionIdField}`, '$trigger.body'].map((v) => (
                <span key={v} className="text-[10px] font-mono text-zinc-500">{v}</span>
              ))}
            </div>
          </>
        )}

        {activeTab === 'prompt' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Bot className="w-3 h-3" /> System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => updateConfig?.('systemPrompt', e.target.value)}
                placeholder="You are a helpful assistant. Answer the user's question clearly and concisely."
                rows={6}
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-pink-500/50 transition-colors resize-none leading-relaxed placeholder:text-zinc-700"
              />
              <p className="text-[9px] text-zinc-600 leading-relaxed">
                Reference as <span className="font-mono text-zinc-500">{'{{ $trigger.systemPrompt }}'}</span> in any AI node's system prompt field.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
              <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] font-bold text-zinc-300 block">Require Bearer Token</span>
                <span className="text-[9px] text-zinc-600 mt-0.5 block leading-relaxed">
                  Only your app can call this trigger
                </span>
              </div>
              <div
                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-0.5 ${authEnabled ? 'bg-pink-500' : 'bg-zinc-700'}`}
                onClick={() => updateConfig?.('authEnabled', !authEnabled)}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${authEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>

            {authEnabled && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Secret Token</label>
                <input
                  type="password"
                  value={config.secret || ''}
                  onChange={(e) => updateConfig?.('secret', e.target.value)}
                  placeholder="Paste a strong secret…"
                  className="w-full bg-[#111111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-pink-500/50 transition-colors font-mono"
                />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
