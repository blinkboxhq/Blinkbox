import { useEffect } from 'react';
import imgWhatsApp from './logo.png';
import {
  MessageSquare, Image, Video, FileText, Music, Sticker, MapPin, User, Smile,
  MousePointerClick, List, Layout, CheckCircle, Phone, Hash,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, AddRow, RemovableRow
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

export const OPERATIONS = [
  { value: 'sendMessage',  label: 'Send Text',     icon: MessageSquare },
  { value: 'sendImage',    label: 'Send Image',    icon: Image },
  { value: 'sendVideo',    label: 'Send Video',    icon: Video },
  { value: 'sendDocument', label: 'Send Document', icon: FileText },
  { value: 'sendAudio',    label: 'Send Audio',    icon: Music },
  { value: 'sendSticker',  label: 'Send Sticker',  icon: Sticker },
  { value: 'sendLocation', label: 'Send Location', icon: MapPin },
  { value: 'sendContact',  label: 'Send Contact',  icon: User },
  { value: 'sendReaction', label: 'Send Reaction', icon: Smile },
  { value: 'sendButtons',  label: 'Reply Buttons', icon: MousePointerClick },
  { value: 'sendList',     label: 'List Message',  icon: List },
  { value: 'sendTemplate', label: 'Use Template',  icon: Layout },
  { value: 'markRead',     label: 'Mark Read',     icon: CheckCircle },
];

function Field({ label, icon, optional, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel icon={icon}>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
    </div>
  );
}

export default function WhatsAppNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const operation = LABEL_TO_OP[config.selectedAction] || config.operation || 'sendMessage';

  useEffect(() => {
    if (operation && operation !== config.operation) updateConfig('operation', operation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation]);
  const buttons = Array.isArray(config.buttons) ? config.buttons : [];
  const rows = Array.isArray(config.rows) ? config.rows : [];
  const setItems = (k, arr) => updateConfig(k, arr);

  const text = (label, key, opts = {}) => (
    <Field label={label} icon={opts.icon} optional={opts.optional}>
      <SmartVariableInput
        value={config[key] || (opts.fallback ?? '')}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">


      {text('Phone Number ID', 'phoneNumberId', { icon: Phone, placeholder: 'From Meta Business dashboard' })}

      {operation !== 'markRead' &&
        text('To (Recipient)', 'to', { icon: User, placeholder: '14155551234 (no + or spaces)' })}

      {operation === 'sendMessage' &&
        text('Message', 'text', { icon: MessageSquare, placeholder: 'Hello {{trigger.data.name}}!', multiline: true })}

      {operation === 'sendImage' && (
        <>
          {text('Image URL', 'imageUrl', { icon: Image, placeholder: 'https://example.com/image.jpg' })}
          {text('Caption', 'caption', { optional: true, placeholder: 'Check this out!' })}
        </>
      )}

      {operation === 'sendVideo' && (
        <>
          {text('Video URL', 'videoUrl', { icon: Video, placeholder: 'https://example.com/clip.mp4' })}
          {text('Caption', 'caption', { optional: true, placeholder: 'Watch this!' })}
        </>
      )}

      {operation === 'sendSticker' &&
        text('Sticker URL (.webp)', 'stickerUrl', { icon: Sticker, placeholder: 'https://example.com/sticker.webp' })}

      {operation === 'sendDocument' && (
        <>
          {text('Document URL', 'documentUrl', { icon: FileText, placeholder: 'https://example.com/file.pdf' })}
          {text('Filename', 'filename', { optional: true, placeholder: 'report.pdf' })}
        </>
      )}

      {operation === 'sendAudio' &&
        text('Audio URL', 'audioUrl', { icon: Music, placeholder: 'https://example.com/audio.mp3' })}

      {operation === 'sendLocation' && (
        <>
          <div className="flex gap-3">
            <div className="flex-1">{text('Latitude', 'latitude', { placeholder: '37.7749' })}</div>
            <div className="flex-1">{text('Longitude', 'longitude', { placeholder: '-122.4194' })}</div>
          </div>
          {text('Location Name', 'locationName', { optional: true, placeholder: 'Our Office' })}
        </>
      )}

      {operation === 'sendContact' && (
        <>
          {text('Contact Name', 'contactName', { icon: User, placeholder: 'Jane Doe' })}
          <div className="flex gap-3">
            <div className="flex-1">{text('Contact Phone', 'contactPhone', { placeholder: '+15551234567' })}</div>
            <div className="flex-1">{text('Email', 'contactEmail', { optional: true, placeholder: 'jane@example.com' })}</div>
          </div>
        </>
      )}

      {operation === 'sendReaction' && (
        <>
          {text('Message ID (to react to)', 'messageId', { placeholder: '{{trigger.data.message.id}}' })}
          <ConfigInput
            label="Emoji"
            value={config.emoji || ''}
            onChange={(val) => updateConfig('emoji', val)}
            placeholder="👍"
          />
        </>
      )}

      {operation === 'sendButtons' && (
        <>
          {text('Header', 'headerText', { optional: true, placeholder: 'Quick question' })}
          {text('Body Text', 'bodyText', { placeholder: 'How can we help you today?' })}
          {text('Footer', 'footerText', { optional: true, placeholder: 'Powered by Blinkbox' })}
          <Field
            label={<>Buttons <span className="text-neutral-700 normal-case tracking-normal">(max 3)</span></>}
          >
            <div className="flex flex-col gap-1.5">
              {buttons.map((btn, i) => (
                <RemovableRow key={i} onRemove={() => setItems('buttons', buttons.filter((_, j) => j !== i))}>
                  <div className="flex gap-2">
                    <input
                      value={btn.title || ''}
                      onChange={(e) => setItems('buttons', buttons.map((b, j) => (j === i ? { ...b, title: e.target.value } : b)))}
                      placeholder="Button label"
                      className="flex-1 bg-transparent text-[12px] text-neutral-100 font-mono outline-none placeholder-neutral-600"
                    />
                    <input
                      value={btn.id || ''}
                      onChange={(e) => setItems('buttons', buttons.map((b, j) => (j === i ? { ...b, id: e.target.value } : b)))}
                      placeholder="reply_id"
                      className="flex-1 bg-transparent text-[12px] text-neutral-100 font-mono outline-none placeholder-neutral-600"
                    />
                  </div>
                </RemovableRow>
              ))}
              {buttons.length < 3 && (
                <AddRow label="Add Button" onClick={() => setItems('buttons', [...buttons, { id: '', title: '' }])} accentColor={ACCENT} />
              )}
            </div>
          </Field>
        </>
      )}

      {operation === 'sendList' && (
        <>
          {text('Header', 'headerText', { optional: true, placeholder: 'Menu' })}
          {text('Body Text', 'bodyText', { placeholder: 'Pick an option below' })}
          {text('Footer', 'footerText', { optional: true, placeholder: 'Powered by Blinkbox' })}
          <div className="flex gap-3">
            <div className="flex-1">
              <ConfigInput
                label="Button Text"
                value={config.buttonText || ''}
                onChange={(val) => updateConfig('buttonText', val)}
                placeholder="View options"
              />
            </div>
            <div className="flex-1">
              <ConfigInput
                label={<>Section Title <span className="text-neutral-700 normal-case tracking-normal">(optional)</span></>}
                value={config.sectionTitle || ''}
                onChange={(val) => updateConfig('sectionTitle', val)}
                placeholder="Available items"
              />
            </div>
          </div>
          <Field
            label={<>Rows <span className="text-neutral-700 normal-case tracking-normal">(max 10)</span></>}
          >
            <div className="flex flex-col gap-1.5">
              {rows.map((row, i) => (
                <RemovableRow key={i} onRemove={() => setItems('rows', rows.filter((_, j) => j !== i))}>
                  <div className="flex flex-col gap-1">
                    <input
                      value={row.title || ''}
                      onChange={(e) => setItems('rows', rows.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)))}
                      placeholder="Row title"
                      className="bg-transparent text-[12px] text-neutral-100 font-mono outline-none placeholder-neutral-600"
                    />
                    <input
                      value={row.description || ''}
                      onChange={(e) => setItems('rows', rows.map((r, j) => (j === i ? { ...r, description: e.target.value } : r)))}
                      placeholder="Description (optional)"
                      className="bg-transparent text-[12px] text-neutral-100 font-mono outline-none placeholder-neutral-600"
                    />
                    <input
                      value={row.id || ''}
                      onChange={(e) => setItems('rows', rows.map((r, j) => (j === i ? { ...r, id: e.target.value } : r)))}
                      placeholder="row_id"
                      className="bg-transparent text-[12px] text-neutral-100 font-mono outline-none placeholder-neutral-600"
                    />
                  </div>
                </RemovableRow>
              ))}
              {rows.length < 10 && (
                <AddRow label="Add Row" onClick={() => setItems('rows', [...rows, { id: '', title: '', description: '' }])} accentColor={ACCENT} />
              )}
            </div>
          </Field>
        </>
      )}

      {operation === 'sendTemplate' && (
        <>
          {text('Template Name', 'templateName', { icon: Layout, placeholder: 'hello_world' })}
          {text('Language Code', 'templateLang', { icon: Hash, placeholder: 'en_US', fallback: 'en_US' })}
        </>
      )}

      {operation === 'markRead' &&
        text('Message ID', 'messageId', { placeholder: '{{trigger.data.message.id}}' })}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Meta Access Token"
        placeholder="Select WhatsApp credential..."
      />
    </ConfigSection>
  );
}
