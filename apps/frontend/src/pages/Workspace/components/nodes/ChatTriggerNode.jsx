import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plus, MessageSquare, Copy, Check, Info, Bot } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../../../../lib/api';

export default function ChatTriggerNode({ config = {}, updateConfig, selected }) {
  const { id: automationId } = useParams();
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const systemPrompt = config.systemPrompt || '';
  const sessionIdField = config.sessionIdField || 'sessionId';

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`relative flex flex-col w-[280px] bg-[#0A0A0A] rounded-xl border transition-colors shadow-2xl font-sans group ${selected ? 'border-pink-500/50' : 'border-[#2A2A2A]'}`}>

      <Handle
        id="output"
        type="source"
        position={Position.Right}
        className="!w-5 !h-5 !flex items-center justify-center !bg-[#111111] !border !border-[#2A2A2A] !rounded-full !opacity-0 group-hover:!opacity-100 transition-all hover:!bg-pink-500 hover:!border-pink-500 text-zinc-500 hover:text-white shadow-xl z-50 cursor-crosshair"
        style={{ top: '20px', right: '-10px', transform: 'translateY(-50%)' }}
      >
        <Plus className="w-3 h-3 pointer-events-none" />
      </Handle>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <MessageSquare className="w-3 h-3 text-pink-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Chat Message Trigger</span>
      </div>

      <div className="p-3 flex flex-col gap-3">

        {/* Webhook URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Endpoint URL</label>
          <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
            <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
            <button onClick={copyUrl} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
              {copied ? <Check className="w-3 h-3 text-pink-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2.5 p-2.5 bg-pink-500/5 border border-pink-500/15 rounded-lg">
          <Info className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            Send <span className="font-mono text-zinc-400">{"{ message: \"...\", sessionId: \"...\" }"}</span> to this URL. The <span className="font-mono text-zinc-400">message</span> field flows into AI nodes downstream.
          </p>
        </div>

        {/* System prompt */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Bot className="w-3 h-3" /> System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => updateConfig?.('systemPrompt', e.target.value)}
            placeholder="You are a helpful assistant. Answer the user's question concisely."
            rows={4}
            className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-pink-500/50 transition-colors resize-none leading-relaxed placeholder:text-zinc-700"
          />
          <p className="text-[9px] text-zinc-600 leading-relaxed">
            Available as <span className="font-mono text-zinc-500">{'{{ $trigger.systemPrompt }}'}</span> in downstream AI nodes.
          </p>
        </div>

        {/* Session ID field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Session ID Field</label>
          <input
            value={sessionIdField}
            onChange={(e) => updateConfig?.('sessionIdField', e.target.value)}
            placeholder="sessionId"
            className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-pink-500/50 transition-colors placeholder:text-zinc-700"
          />
          <p className="text-[9px] text-zinc-600 leading-relaxed">Which field in the request body contains the user/session identifier.</p>
        </div>

      </div>
    </div>
  );
}
