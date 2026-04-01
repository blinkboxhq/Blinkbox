import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Copy, Check, Plus, Lock, Webhook } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../../../../lib/api';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function WebhookTriggerNode({ config = {}, updateConfig, selected }) {
  const { id: automationId } = useParams();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const allowedMethods = config.allowedMethods || ['POST'];
  const authEnabled = config.authEnabled ?? false;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const toggleMethod = (method) => {
    const current = allowedMethods;
    if (current.includes(method)) {
      if (current.length === 1) return;
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
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <Webhook className="w-3 h-3 text-blue-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Webhook Trigger</span>
      </div>

      {/* Tab nav */}
      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['settings', 'security'].map((tab) => (
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

        {activeTab === 'settings' && (
          <>
            {/* URL display */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Webhook URL</label>
              <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
                <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
                <button
                  onClick={copyUrl}
                  className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
                  title="Copy URL"
                >
                  {copied ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
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
