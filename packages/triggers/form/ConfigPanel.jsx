import { useState } from 'react';
import { ClipboardList, Copy, Check, X, Info, Code2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '@/lib/api';

export default function FormTriggerNode({ config = {}, updateConfig, nodeId }) {
  const { id: automationId } = useParams();
  const [copied, setCopied] = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [newField, setNewField] = useState('');
  const [activeTab, setActiveTab] = useState('fields');

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const expectedFields = config.expectedFields || [];

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const addField = () => {
    const trimmed = newField.trim().replace(/\s+/g, '_');
    if (!trimmed || expectedFields.includes(trimmed)) return;
    updateConfig?.('expectedFields', [...expectedFields, trimmed]);
    setNewField('');
  };

  const removeField = (field) => {
    updateConfig?.('expectedFields', expectedFields.filter((f) => f !== field));
  };

  const htmlSnippet = `<form action="${webhookUrl}" method="POST">
${expectedFields.map((f) => `  <input name="${f}" />`).join('\n') || '  <input name="email" />'}
  <button type="submit">Submit</button>
</form>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(htmlSnippet);
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 1800);
  };

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <ClipboardList className="w-3 h-3 text-emerald-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Form Submission Trigger</span>
      </div>

      {/* Tab nav */}
      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['fields', 'snippet'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold capitalize tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
          >
            {tab === 'snippet' ? 'HTML Snippet' : tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">

        {/* Webhook URL — always visible */}
        <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
          <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
          <button onClick={copyUrl} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        {activeTab === 'fields' && (
          <>
            <div className="flex items-start gap-2.5 p-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
              <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Each form field name becomes a variable. Add field names below to document the expected shape.
              </p>
            </div>

            {/* Field list */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Expected Fields</label>

              {expectedFields.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {expectedFields.map((field) => (
                    <span key={field} className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[9px] font-mono px-2 py-0.5 rounded-md">
                      {field}
                      <button onClick={() => removeField(field)} className="text-emerald-600 hover:text-emerald-300 transition-colors ml-0.5">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-1.5">
                <input
                  value={newField}
                  onChange={(e) => setNewField(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addField()}
                  placeholder="field_name"
                  className="flex-1 bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-700"
                />
                <button
                  onClick={addField}
                  className="px-2.5 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-md hover:bg-emerald-500/25 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'snippet' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Code2 className="w-3 h-3" /> HTML Form
              </label>
              <button
                onClick={copySnippet}
                className="flex items-center gap-1 text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {snippetCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {snippetCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-2.5 text-[9px] text-zinc-400 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
              {htmlSnippet}
            </pre>

            {/* Variables */}
            <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg mt-1">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">Available in workflow as</span>
              {(expectedFields.length > 0 ? expectedFields : ['field_name']).map((field) => (
                <div key={field} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-emerald-400 shrink-0">{`$trigger.body.${field}`}</span>
                  <span className="text-[9px] text-zinc-600">Form field "{field}"</span>
                </div>
              ))}
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-emerald-400 shrink-0">$trigger.headers</span>
                <span className="text-[9px] text-zinc-600">Request headers</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
