import { ScanLine } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

const FIELDS = [
  { value: 'invoice_number', label: 'Invoice Number' },
  { value: 'date',           label: 'Date' },
  { value: 'due_date',       label: 'Due Date' },
  { value: 'vendor_name',    label: 'Vendor Name' },
  { value: 'vendor_address', label: 'Vendor Address' },
  { value: 'vendor_gstin',   label: 'Vendor GSTIN' },
  { value: 'buyer_name',     label: 'Buyer Name' },
  { value: 'buyer_gstin',    label: 'Buyer GSTIN' },
  { value: 'line_items',     label: 'Line Items' },
  { value: 'subtotal',       label: 'Subtotal' },
  { value: 'tax_amount',     label: 'Tax Amount' },
  { value: 'total_amount',   label: 'Total Amount' },
  { value: 'currency',       label: 'Currency' },
  { value: 'payment_terms',  label: 'Payment Terms' },
  { value: 'bank_details',   label: 'Bank Details' },
];

export default function InvoiceParserNode({ config = {}, updateConfig, nodeId }) {
  const imageUrl  = config.imageUrl  ?? '';
  const provider  = config.provider  ?? 'openai';
  const model     = config.model     ?? 'gpt-4o';
  const fields    = config.fields    ?? FIELDS.map((f) => f.value);
  const language  = config.language  ?? 'auto';
  const apiKey    = config.apiKey    ?? '';

  const MODELS = {
    openai:    ['gpt-4o', 'gpt-4o-mini'],
    anthropic: ['claude-sonnet-5', 'claude-haiku-4-5'],
    google:    ['gemini-2.0-flash', 'gemini-1.5-pro'],
  };

  const toggleField = (f) => {
    const next = fields.includes(f) ? fields.filter((x) => x !== f) : [...fields, f];
    updateConfig('fields', next);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <ScanLine className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Invoice Parser</div>
          <div className="text-[11px] text-zinc-500">Extract structured fields from any invoice image or PDF</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Invoice Image URL or Base64</label>
        <SmartVariableInput value={imageUrl} onChange={(v) => updateConfig('imageUrl', v)} placeholder="{{ $json.invoiceUrl }}" />
        <p className="text-[10px] text-zinc-600 mt-1">Supports PNG, JPG, PDF (first page), TIFF</p>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">AI Provider</label>
        <div className="flex gap-1.5">
          {Object.keys(MODELS).map((p) => (
            <button key={p} onClick={() => { updateConfig('provider', p); updateConfig('model', MODELS[p][0]); }}
              className={`flex-1 capitalize py-1.5 rounded-lg text-[11px] font-bold border transition-all ${provider === p ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Model</label>
          <select value={model} onChange={(e) => updateConfig('model', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-200 focus:outline-none cursor-pointer">
            {(MODELS[provider] ?? MODELS.openai).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Invoice Language</label>
          <input value={language} onChange={(e) => updateConfig('language', e.target.value)} placeholder="auto"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 focus:outline-none focus:border-zinc-500" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Fields to Extract</label>
        <div className="grid grid-cols-2 gap-1">
          {FIELDS.map((f) => (
            <button key={f.value} onClick={() => toggleField(f.value)}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border transition-all text-left ${fields.includes(f.value) ? 'bg-blue-500/15 border-blue-500/30 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">API Key</label>
        <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="amber"
        label="API Key"
        placeholder="Select API Key..."
      />
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">structured object with selected fields, confidence score</span>
      </div>
    </div>
  );
}
