import { MessageSquare, Image, FileText, Music, MapPin, Layout, CheckCircle } from "lucide-react";
import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

function WhatsAppIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

const OPERATIONS = [
  { value: 'sendMessage',  label: 'Send Text',     icon: MessageSquare },
  { value: 'sendImage',    label: 'Send Image',    icon: Image },
  { value: 'sendDocument', label: 'Send Document', icon: FileText },
  { value: 'sendAudio',    label: 'Send Audio',    icon: Music },
  { value: 'sendLocation', label: 'Send Location', icon: MapPin },
  { value: 'sendTemplate', label: 'Use Template',  icon: Layout },
  { value: 'markRead',     label: 'Mark Read',     icon: CheckCircle },
];

export default function WhatsAppNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || "sendMessage";

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#25D366]/5 border border-[#25D366]/20 rounded-xl">
        <div className="p-2 bg-[#25D366]/10 rounded-lg text-[#25D366] shrink-0">
          <WhatsAppIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#25D366]">WhatsApp</span>
          <span className="text-[10px] text-zinc-500">Meta WhatsApp Cloud API</span>
        </div>
      </div>

      {/* Operation */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-2">
          {OPERATIONS.map((op) => {
            const Icon = op.icon;
            return (
              <button
                key={op.value}
                onClick={() => updateConfig('operation', op.value)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  operation === op.value
                    ? 'bg-[#25D366]/10 border-[#25D366]/40 text-[#25D366]'
                    : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" /> {op.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Phone Number ID */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Phone Number ID</label>
        <input
          value={config.phoneNumberId || ''}
          onChange={(e) => updateConfig('phoneNumberId', e.target.value)}
          placeholder="From Meta Business dashboard"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#25D366]/40 transition-colors"
        />
      </div>

      {/* Recipient */}
      {operation !== 'markRead' && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">To (Recipient)</label>
          <SmartVariableInput
            value={config.to || ''}
            onChange={(val) => updateConfig('to', val)}
            placeholder="14155551234 (no + or spaces)"
          />
        </div>
      )}

      {/* sendMessage */}
      {operation === 'sendMessage' && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message</label>
          <SmartVariableInput
            value={config.text || ''}
            onChange={(val) => updateConfig('text', val)}
            placeholder="Hello {{trigger.data.name}}!"
            multiline
          />
        </div>
      )}

      {/* sendImage */}
      {operation === 'sendImage' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Image URL</label>
            <SmartVariableInput value={config.imageUrl || ''} onChange={(val) => updateConfig('imageUrl', val)} placeholder="https://example.com/image.jpg" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Caption <span className="text-zinc-700">(optional)</span></label>
            <SmartVariableInput value={config.caption || ''} onChange={(val) => updateConfig('caption', val)} placeholder="Check this out!" />
          </div>
        </>
      )}

      {/* sendDocument */}
      {operation === 'sendDocument' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Document URL</label>
            <SmartVariableInput value={config.documentUrl || ''} onChange={(val) => updateConfig('documentUrl', val)} placeholder="https://example.com/file.pdf" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filename <span className="text-zinc-700">(optional)</span></label>
            <input value={config.filename || ''} onChange={(e) => updateConfig('filename', e.target.value)} placeholder="report.pdf"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#25D366]/40 transition-colors" />
          </div>
        </>
      )}

      {/* sendAudio */}
      {operation === 'sendAudio' && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Audio URL</label>
          <SmartVariableInput value={config.audioUrl || ''} onChange={(val) => updateConfig('audioUrl', val)} placeholder="https://example.com/audio.mp3" />
        </div>
      )}

      {/* sendLocation */}
      {operation === 'sendLocation' && (
        <>
          <div className="flex gap-3">
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Latitude</label>
              <SmartVariableInput value={config.latitude || ''} onChange={(val) => updateConfig('latitude', val)} placeholder="37.7749" />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Longitude</label>
              <SmartVariableInput value={config.longitude || ''} onChange={(val) => updateConfig('longitude', val)} placeholder="-122.4194" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Location Name <span className="text-zinc-700">(optional)</span></label>
            <SmartVariableInput value={config.locationName || ''} onChange={(val) => updateConfig('locationName', val)} placeholder="Our Office" />
          </div>
        </>
      )}

      {/* sendTemplate */}
      {operation === 'sendTemplate' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Template Name</label>
            <input value={config.templateName || ''} onChange={(e) => updateConfig('templateName', e.target.value)} placeholder="hello_world"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#25D366]/40 transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Language Code</label>
            <input value={config.templateLang || 'en_US'} onChange={(e) => updateConfig('templateLang', e.target.value)} placeholder="en_US"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#25D366]/40 transition-colors" />
          </div>
        </>
      )}

      {/* markRead */}
      {operation === 'markRead' && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message ID</label>
          <SmartVariableInput value={config.messageId || ''} onChange={(val) => updateConfig('messageId', val)} placeholder="{{trigger.data.message.id}}" />
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
