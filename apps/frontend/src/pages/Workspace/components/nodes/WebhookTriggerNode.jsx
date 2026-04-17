import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Copy, Check, Plus, Lock, Webhook, Zap } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../../../../lib/api';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function WebhookTriggerNode({ config = {}, updateConfig, selected }) {
  const { id: automationId } = useParams();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('setup');

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const syncUrl = `${webhookUrl}?wait=true`;
  const allowedMethods = config.allowedMethods || ['POST'];
  const authEnabled = config.authEnabled ?? false;
  const syncMode = config.syncMode ?? false;

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const toggleMethod = (method) => {
    if (allowedMethods.includes(method)) {
      if (allowedMethods.length === 1) return;
      updateConfig?.('allowedMethods', allowedMethods.filter((m) => m !== method));
    } else {
      updateConfig?.('allowedMethods', [...allowedMethods, method]);
    }
  };

  const activeUrl = syncMode ? syncUrl : webhookUrl;

  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-blue-500/50' : 'border-[#2A2A2A]'}`}>

      <Handle
        id="output"
        type="source"
        position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-blue-500 hover:!border-blue-500 text-zinc-500 hover:text-white shadow-xl z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}
      >
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <Webhook className="w-3 h-3 text-blue-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Webhook</span>
        {syncMode && (
          <span className="ml-auto text-[8px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
            Sync
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'security'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
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
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Your Webhook URL</label>
              <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
                <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{activeUrl}</span>
                <button
                  onClick={() => copy(activeUrl)}
                  className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
                  title="Copy URL"
                >
                  {copied ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* HTTP Methods */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Accept Methods</label>
              <div className="flex flex-wrap gap-1.5">
                {METHODS.map((m) => {
                  const on = allowedMethods.includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => toggleMethod(m)}
                      className={`px-2 py-1 rounded-md text-[9px] font-bold tracking-wide border transition-all ${on ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : 'bg-[#111] border-[#2A2A2A] text-zinc-600 hover:text-zinc-400 hover:border-zinc-600'}`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sync mode */}
            <div className="flex items-center justify-between p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
              <div className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-zinc-300 block">Wait for response</span>
                  <span className="text-[9px] text-zinc-600 mt-0.5 block leading-relaxed">
                    Holds the connection until the workflow finishes and returns output
                  </span>
                </div>
              </div>
              <div
                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ml-2 ${syncMode ? 'bg-blue-500' : 'bg-zinc-700'}`}
                onClick={() => updateConfig?.('syncMode', !syncMode)}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${syncMode ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Payload hint */}
            <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Available in workflow as</span>
              {['$trigger.body', '$trigger.query', '$trigger.headers', '$trigger.method'].map((v) => (
                <span key={v} className="text-[10px] font-mono text-zinc-500">{v}</span>
              ))}
            </div>
          </>
        )}

        {activeTab === 'security' && (
          <div className="flex flex-col gap-3">
            {/* Bearer Token Auth */}
            <div className="flex items-start gap-3 p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
              <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] font-bold text-zinc-300 block">Require Bearer Token</span>
                <span className="text-[9px] text-zinc-600 mt-0.5 block leading-relaxed">
                  Callers must pass <span className="font-mono text-zinc-500">Authorization: Bearer &lt;secret&gt;</span>
                </span>
              </div>
              <div
                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-0.5 ${authEnabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
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
                  className="w-full bg-[#111111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                />
                <p className="text-[9px] text-zinc-600">Keep this secret. Requests without it will be rejected with 401.</p>
              </div>
            )}

            {/* HMAC Signature Verification */}
            <div className="flex flex-col gap-2 border-t border-[#1a1a1a] pt-3">
              <div className="flex items-start gap-3 p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
                <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-zinc-300 block">HMAC Signature Verification</span>
                  <span className="text-[9px] text-zinc-600 mt-0.5 block leading-relaxed">
                    Verify webhook came from a trusted source (GitHub/Stripe-style)
                  </span>
                </div>
                <div
                  className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-0.5 ${config.hmacEnabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
                  onClick={() => updateConfig?.('hmacEnabled', !config.hmacEnabled)}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${config.hmacEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {config.hmacEnabled && (
                <div className="flex flex-col gap-2 px-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">HMAC Secret</label>
                    <input
                      type="password"
                      value={config.hmacSecret || ''}
                      onChange={(e) => updateConfig?.('hmacSecret', e.target.value)}
                      placeholder="Shared secret from provider…"
                      className="w-full bg-[#111111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Algorithm</label>
                      <select
                        value={config.hmacAlgorithm || 'sha256'}
                        onChange={(e) => updateConfig?.('hmacAlgorithm', e.target.value)}
                        className="w-full bg-[#111] border border-[#222] rounded-md px-2 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                      >
                        <option value="sha256">SHA-256</option>
                        <option value="sha1">SHA-1 (legacy)</option>
                        <option value="sha512">SHA-512</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Signature Header</label>
                      <input
                        value={config.hmacHeader || 'x-hub-signature-256'}
                        onChange={(e) => updateConfig?.('hmacHeader', e.target.value)}
                        className="w-full bg-[#111111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-zinc-600 leading-relaxed">
                    Requests with invalid or missing signatures will be rejected with 401.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
