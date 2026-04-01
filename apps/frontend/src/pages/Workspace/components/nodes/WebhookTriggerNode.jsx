import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Copy, Check, Plus, Globe, Lock, Webhook } from 'lucide-react';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function WebhookTriggerNode({ config = {}, updateConfig, selected }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  const path = config.path || '';
  const allowedMethods = config.allowedMethods || ['POST'];
  const authEnabled = config.authEnabled ?? false;

  // Derive the display URL — in prod this would use the real base URL
  const baseUrl = 'https://your-blinkbox.app/webhook';
  const displayUrl = path ? `${baseUrl}/${path}` : `${baseUrl}/...`;

  const copyUrl = () => {
    if (!path) return;
    navigator.clipboard.writeText(`${baseUrl}/${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const toggleMethod = (method) => {
    const current = allowedMethods;
    if (current.includes(method)) {
      if (current.length === 1) return; // always keep at least one
      updateConfig?.('allowedMethods', current.filter((m) => m !== method));
    } else {
      updateConfig?.('allowedMethods', [...current, method]);
    }
  };

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
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#222] rounded-md border border-[#333]">
            <Webhook className="w-3 h-3 text-blue-400" />
          </div>
          <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Webhook Trigger</span>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['settings', 'security'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all capitalize ${activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">

        {activeTab === 'settings' && (
          <>
            {/* URL display */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Webhook URL</label>
              <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2 group/url">
                <Globe className="w-3 h-3 text-zinc-600 shrink-0" />
                <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{displayUrl}</span>
                <button
                  onClick={copyUrl}
                  disabled={!path}
                  className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-30"
                  title="Copy URL"
                >
                  {copied ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Path */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Path</label>
              <div className="flex items-center bg-[#111] border border-[#222] rounded-lg overflow-hidden focus-within:border-blue-500/50 transition-colors">
                <span className="px-2.5 py-1.5 text-[10px] text-zinc-600 font-mono border-r border-[#222] bg-[#0d0d0d] select-none">/</span>
                <input
                  value={path}
                  onChange={(e) => updateConfig?.('path', e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                  placeholder="my-webhook"
                  className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-blue-300 font-mono focus:outline-none placeholder:text-zinc-700"
                />
              </div>
              <p className="text-[9px] text-zinc-600 leading-relaxed">Letters, numbers, hyphens and underscores only.</p>
            </div>

            {/* HTTP methods */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Allowed Methods</label>
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
          </>
        )}

        {activeTab === 'security' && (
          <div className="flex flex-col gap-3">
            {/* Auth toggle */}
            <div className="flex items-start gap-3 p-2.5 bg-[#111] border border-[#1e1e1e] rounded-lg">
              <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] font-bold text-zinc-300 block">Require Auth Header</span>
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
                  placeholder="Paste or generate a secret…"
                  className="w-full bg-[#111111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
