import { Phone, MessageSquare, Hash } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

export default function WhatsAppNode({ config = {}, updateConfig }) {
  const useTemplate = !!config.templateName;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
        <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 shrink-0">
          <Phone className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-green-400">WhatsApp</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">Meta Cloud API messaging</span>
        </div>
      </div>

      {/* Phone Number ID */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Hash className="w-3.5 h-3.5 text-green-400" /> Phone Number ID
        </label>
        <input
          type="text"
          value={config.phoneNumberId || ''}
          onChange={(e) => updateConfig('phoneNumberId', e.target.value)}
          placeholder="From your Meta Business dashboard"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-green-500/50 transition-colors shadow-inner"
        />
      </div>

      {/* Recipient */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-green-400" /> Recipient Phone
        </label>
        <SmartVariableInput
          value={config.to || ''}
          onChange={(val) => updateConfig('to', val)}
          placeholder="e.g. 14155551234 (international format, no +)"
        />
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-[#222]">
        <button
          onClick={() => { updateConfig('templateName', ''); }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
            !useTemplate ? 'bg-[#222] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Free Text
        </button>
        <button
          onClick={() => { updateConfig('templateName', config.templateName || 'hello_world'); }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
            useTemplate ? 'bg-[#222] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Template
        </button>
      </div>

      {/* Message or Template */}
      {useTemplate ? (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Template Name</label>
          <input
            type="text"
            value={config.templateName || ''}
            onChange={(e) => updateConfig('templateName', e.target.value)}
            placeholder="e.g. hello_world"
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-green-500/50 transition-colors shadow-inner"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-green-400" /> Message
          </label>
          <SmartVariableInput
            value={config.text || ''}
            onChange={(val) => updateConfig('text', val)}
            placeholder="Type your WhatsApp message..."
            multiline
          />
        </div>
      )}

      {/* Credential */}
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="green"
        label="Meta Access Token"
        placeholder="Select WhatsApp credential..."
      />
    </div>
  );
}
