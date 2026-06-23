import { FileCode } from 'lucide-react';
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";

export default function TemplateRendererNode({ config = {}, updateConfig, nodeId }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center shrink-0">
            <FileCode className="w-4 h-4 text-[#F59E0B]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-amber-400">Template Renderer</span>
          <span className="text-[10px] text-zinc-500">Render Handlebars templates with dynamic data</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Template</label>
        <textarea
          rows={6}
          value={config.template || ""}
          onChange={(e) => updateConfig("template", e.target.value)}
          placeholder={"Hello {{name}}!\nYour order #{{orderId}} has shipped.\n{{#if trackingUrl}}Track here: {{trackingUrl}}{{/if}}"}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-zinc-300 font-mono resize-y focus:outline-none focus:border-amber-500/40"
        />
        <p className="text-[9px] text-zinc-600">Handlebars syntax: {'{{variable}}'}, {'{{#if cond}}...{{/if}}'}, {'{{#each items}}...{{/each}}'}</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Context Data</label>
        <SmartVariableInput
          value={config.context || ""}
          onChange={(v) => updateConfig("context", v)}
          placeholder='{{upstream}} or {"name": "Alice", "orderId": "123"}'
          nodeId={nodeId}
        />
        <p className="text-[9px] text-zinc-600">Pass an object from upstream or a JSON literal</p>
      </div>
    </div>
  );
}
