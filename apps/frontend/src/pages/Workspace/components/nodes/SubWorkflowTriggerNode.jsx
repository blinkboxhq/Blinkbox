import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plus, Workflow, Copy, Check, Lock, Info, Terminal } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../../../../lib/api';
import SmartJsonEditor from '../../../../components/ui/SmartJsonEditor';

export default function SubWorkflowTriggerNode({ config = {}, updateConfig, selected }) {
  const { id: automationId } = useParams();
  const [copied, setCopied] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('setup');

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const authEnabled = config.authEnabled ?? false;

  const curlSnippet = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\${authEnabled && config.secret ? `\n  -H "Authorization: Bearer ${config.secret}" \\` : ''}
  -d '${JSON.stringify({ input: config.inputSchema ? JSON.parse(config.inputSchema || '{}') : { data: 'your payload' } }, null, 2).replace(/\n/g, '\n  ')}'`;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCurlCopied(true);
    setTimeout(() => setCurlCopied(false), 1800);
  };

  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-cyan-500/50' : 'border-[#2A2A2A]'}`}>

      <Handle
        id="output"
        type="source"
        position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-cyan-500 hover:!border-cyan-500 text-zinc-500 hover:text-white shadow-xl z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}
      >
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <Workflow className="w-3 h-3 text-cyan-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Sub-Workflow Trigger</span>
      </div>

      {/* Tab nav */}
      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'security', 'schema'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold capitalize tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">

        {activeTab === 'setup' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Webhook URL</label>
              <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
                <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
                <button onClick={copyUrl} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
                  {copied ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 bg-cyan-500/5 border border-cyan-500/15 rounded-lg">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Call this URL from an HTTP Request node in another workflow to chain automations together.
              </p>
            </div>

            {/* curl snippet */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Terminal className="w-3 h-3" /> curl
                </label>
                <button onClick={copyCurl} className="flex items-center gap-1 text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors">
                  {curlCopied ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                  {curlCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-2.5 text-[9px] text-zinc-400 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
                {curlSnippet}
              </pre>
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
                  Caller must pass <span className="font-mono text-zinc-500">Authorization: Bearer &lt;secret&gt;</span>
                </span>
              </div>
              <div
                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-0.5 ${authEnabled ? 'bg-cyan-500' : 'bg-zinc-700'}`}
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
                  placeholder="Paste a secret token…"
                  className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Expected Input Schema</label>
            <SmartJsonEditor
              label="Input Schema"
              value={config.inputSchema || '{\n  "input": "string"\n}'}
              onChange={(val) => updateConfig?.('inputSchema', val)}
              rows={6}
            />
            <p className="text-[9px] text-zinc-600 leading-relaxed">Document the JSON shape this workflow expects. Helps callers know what to send.</p>

            <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg mt-1">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Available in workflow as</span>
              {[
                ['$trigger.body', 'Full JSON body sent by the calling workflow'],
                ['$trigger.body.*', 'Any field from the posted payload'],
                ['$trigger.headers', 'Request headers (incl. Authorization)'],
                ['$trigger.query', 'URL query parameters'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-cyan-400 shrink-0">{key}</span>
                  <span className="text-[9px] text-zinc-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
