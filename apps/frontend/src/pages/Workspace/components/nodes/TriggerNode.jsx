import { useState } from 'react';
import { MousePointerClick, AlertTriangle } from 'lucide-react';
import SmartJsonEditor from '../../../../components/ui/SmartJsonEditor';

export default function TriggerNode({ config = {}, updateConfig, nodeId }) {
  const [activeTab, setActiveTab] = useState('payload');

  const forceExecution = config.forceExecution ?? true;
  const mockPayload = config.mockPayload || '{\n  "status": "triggered"\n}';

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <MousePointerClick className="w-3 h-3 text-green-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Manual Trigger</span>
      </div>

      {/* Tab nav */}
      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['payload', 'settings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-green-500 text-green-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">

        {/* Payload Tab */}
        {activeTab === 'payload' && (
          <div className="flex flex-col gap-2">
            <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
              Test Payload
            </label>
            <SmartJsonEditor
              label="Mock Payload"
              value={mockPayload}
              onChange={(val) => updateConfig?.('mockPayload', val)}
              rows={6}
            />
            <p className="text-[9px] text-zinc-600 leading-relaxed">
              This JSON is injected as the trigger input when you click <span className="text-zinc-500 font-semibold">Run</span>.
            </p>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <>
            <div className="flex items-start gap-2 p-2.5 bg-red-500/5 border border-red-500/15 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-[10px] font-bold text-red-400">Force Execution</span>
                <span className="text-[9px] text-zinc-500 leading-relaxed">
                  Swallow init errors and force-start regardless.
                </span>
              </div>
              <div
                className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-0.5 ${forceExecution ? 'bg-green-500' : 'bg-zinc-700'}`}
                onClick={() => updateConfig?.('forceExecution', !forceExecution)}
              >
                <div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${forceExecution ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>

            <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Available in workflow as</span>
              {[
                ['$trigger.status', 'Always "triggered" unless you customise the payload'],
                ['$trigger.*', 'Any field from the mock payload above'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-green-400 shrink-0">{key}</span>
                  <span className="text-[9px] text-zinc-600">{desc}</span>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
