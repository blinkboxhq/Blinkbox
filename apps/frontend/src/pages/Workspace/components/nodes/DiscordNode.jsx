import { MessageSquare, Layout, FileText, PlusCircle, Trash2 } from "lucide-react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

function DiscordIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const OPERATIONS = [
  { value: 'sendMessage', label: 'Send Message', icon: MessageSquare },
  { value: 'sendEmbed',   label: 'Send Embed',   icon: Layout },
  { value: 'sendFile',    label: 'Send File',     icon: FileText },
];

export default function DiscordNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || "sendMessage";
  const fields = Array.isArray(config.fields) ? config.fields : [];

  const addField = () => updateConfig('fields', [...fields, { name: '', value: '', inline: true }]);
  const removeField = (i) => updateConfig('fields', fields.filter((_, idx) => idx !== i));
  const updateField = (i, key, val) => {
    const next = fields.map((f, idx) => idx === i ? { ...f, [key]: val } : f);
    updateConfig('fields', next);
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl">
        <div className="p-2 bg-[#5865F2]/20 rounded-lg text-[#5865F2] shrink-0">
          <DiscordIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#5865F2]">Discord</span>
          <span className="text-[10px] text-zinc-400">Discord Webhook</span>
        </div>
      </div>

      {/* Operation */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-3 gap-2">
          {OPERATIONS.map((op) => {
            const Icon = op.icon;
            return (
              <button
                key={op.value}
                onClick={() => updateConfig('operation', op.value)}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  operation === op.value
                    ? 'bg-[#5865F2]/10 border-[#5865F2]/40 text-[#5865F2]'
                    : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                }`}
              >
                <Icon className="w-4 h-4" /> {op.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Webhook URL — all ops */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Webhook URL</label>
        <SmartVariableInput
          value={config.webhookUrl || ""}
          onChange={(val) => updateConfig("webhookUrl", val)}
          placeholder="https://discord.com/api/webhooks/..."
          nodeId={nodeId}
        />
        <p className="text-[10px] text-zinc-600">Server Settings → Integrations → Webhooks → New Webhook</p>
      </div>

      {/* Bot name (all ops) */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Bot Name <span className="text-zinc-700">(optional)</span></label>
        <input
          value={config.username || ""}
          onChange={(e) => updateConfig("username", e.target.value)}
          placeholder="BlinkBox Bot"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-[#5865F2]/50 transition-colors"
        />
      </div>

      {/* sendMessage */}
      {operation === "sendMessage" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message</label>
          <SmartVariableInput
            value={config.message || ""}
            onChange={(val) => updateConfig("message", val)}
            placeholder="Alert: {{trigger.data.event}} just happened!"
            multiline
            nodeId={nodeId}
          />
          <p className="text-[10px] text-zinc-600">Max 2000 characters. Supports Discord markdown.</p>
        </div>
      )}

      {/* sendEmbed */}
      {operation === "sendEmbed" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title <span className="text-zinc-700">(optional)</span></label>
            <SmartVariableInput
              value={config.title || ""}
              onChange={(val) => updateConfig("title", val)}
              placeholder="New Event"
              nodeId={nodeId}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
            <SmartVariableInput
              value={config.description || ""}
              onChange={(val) => updateConfig("description", val)}
              placeholder="Something happened that you should know about..."
              multiline
              nodeId={nodeId}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Color</label>
              <input
                type="color"
                value={config.color || "#5865F2"}
                onChange={(e) => updateConfig("color", e.target.value)}
                className="w-full h-9 rounded-lg border border-[#222] bg-[#0a0a0a] cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Thumbnail URL <span className="text-zinc-700">(opt)</span></label>
              <SmartVariableInput
                value={config.thumbnailUrl || ""}
                onChange={(val) => updateConfig("thumbnailUrl", val)}
                placeholder="https://..."
                nodeId={nodeId}
              />
            </div>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-3 bg-[#0a0a0a] p-4 border border-[#222] rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Fields</span>
              <button onClick={addField} className="flex items-center gap-1 text-[10px] font-bold text-[#5865F2] hover:text-blue-400 uppercase">
                <PlusCircle className="w-3 h-3" /> Add
              </button>
            </div>
            {fields.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-2">No fields. Click Add to create key-value pairs.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {fields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={f.name}
                      onChange={(e) => updateField(i, 'name', e.target.value)}
                      placeholder="Field name"
                      className="w-1/3 bg-[#111] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#5865F2]/50"
                    />
                    <SmartVariableInput
                      value={f.value}
                      onChange={(val) => updateField(i, 'value', val)}
                      placeholder="Value"
                      nodeId={nodeId}
                    />
                    <button
                      onClick={() => updateField(i, 'inline', !f.inline)}
                      className={`px-2 py-1.5 rounded text-[10px] font-bold border shrink-0 ${f.inline ? 'bg-[#5865F2]/10 border-[#5865F2]/40 text-[#5865F2]' : 'border-[#222] text-zinc-600'}`}
                    >
                      Inline
                    </button>
                    <button onClick={() => removeField(i)} className="p-1 text-zinc-600 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Footer Text <span className="text-zinc-700">(optional)</span></label>
            <SmartVariableInput
              value={config.footerText || ""}
              onChange={(val) => updateConfig("footerText", val)}
              placeholder="Sent by BlinkBox"
              nodeId={nodeId}
            />
          </div>
        </>
      )}

      {/* sendFile */}
      {operation === "sendFile" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">File Name</label>
            <input
              value={config.filename || ""}
              onChange={(e) => updateConfig("filename", e.target.value)}
              placeholder="output.txt"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]/50 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">File Content</label>
            <SmartVariableInput
              value={config.content || ""}
              onChange={(val) => updateConfig("content", val)}
              placeholder="{{previousNode.result}}"
              multiline
              nodeId={nodeId}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message <span className="text-zinc-700">(optional)</span></label>
            <SmartVariableInput
              value={config.message || ""}
              onChange={(val) => updateConfig("message", val)}
              placeholder="Here's the file you requested"
              nodeId={nodeId}
            />
          </div>
        </>
      )}
    </div>
  );
}
