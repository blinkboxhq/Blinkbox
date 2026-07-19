import imgTwilio from './logo.svg';
import {
  MessageSquare, Image, MessageCircle, FileSearch, List, Trash2, Phone,
  PhoneCall, PhoneOff, ShieldCheck, KeyRound, Search, Hash,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, ConfigPills, ConfigBanner, ConnectAppGuide,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'sendSms',          label: 'Send SMS',       icon: MessageSquare, group: 'Messaging' },
  { value: 'sendMms',          label: 'Send MMS',       icon: Image,         group: 'Messaging' },
  { value: 'sendWhatsApp',     label: 'Send WhatsApp',  icon: MessageCircle, group: 'Messaging' },
  { value: 'getMessage',       label: 'Get Message',    icon: FileSearch,    group: 'Messaging' },
  { value: 'listMessages',     label: 'List Messages',  icon: List,          group: 'Messaging' },
  { value: 'deleteMessage',    label: 'Delete Message', icon: Trash2,        group: 'Messaging' },
  { value: 'makeCall',         label: 'Make Call',      icon: PhoneCall,     group: 'Voice' },
  { value: 'getCall',          label: 'Get Call',       icon: Phone,         group: 'Voice' },
  { value: 'listCalls',        label: 'List Calls',     icon: List,          group: 'Voice' },
  { value: 'hangupCall',       label: 'Hang Up Call',   icon: PhoneOff,      group: 'Voice' },
  { value: 'sendVerification', label: 'Send OTP',       icon: ShieldCheck,   group: 'Verify' },
  { value: 'checkVerification',label: 'Check OTP',      icon: KeyRound,      group: 'Verify' },
  { value: 'lookupNumber',     label: 'Lookup Number',  icon: Search,        group: 'Lookup' },
  { value: 'listNumbers',      label: 'List Numbers',   icon: Hash,          group: 'Lookup' },
];

const CHANNELS = [
  { value: 'sms', label: 'SMS' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
];

const SHOW = {
  to: ['sendSms', 'sendMms', 'sendWhatsApp', 'makeCall', 'sendVerification', 'checkVerification'],
  from: ['sendSms', 'sendMms', 'sendWhatsApp', 'makeCall'],
  bodyMsg: ['sendSms', 'sendWhatsApp'],
  media: ['sendMms', 'sendWhatsApp'],
  filterList: ['listMessages', 'listCalls'],
  maxResults: ['listMessages', 'listCalls', 'listNumbers'],
  verify: ['sendVerification', 'checkVerification'],
};

function Field({ label, hint, optional, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
      {hint && <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{hint}</p>}
    </div>
  );
}

export default function TwilioNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'sendSms';
  const currentOp = OPERATIONS.find((o) => o.value === operation);

  const field = (label, k, opts = {}) => (
    <Field label={label} hint={opts.hint} optional={opts.optional}>
      <SmartVariableInput value={config[k] || ''} onChange={(val) => updateConfig(k, val)} placeholder={opts.placeholder} multiline={opts.multiline} nodeId={nodeId} />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader logoUrl={imgTwilio} title="Twilio" subtitle={currentOp?.label || 'SMS, voice, WhatsApp & Verify'} />

      <ConnectAppGuide
        title="Connect your Twilio account"
        accentColor={ACCENT}
        steps={[
          <>Sign in at <span className="text-[#8fb0ff]">console.twilio.com</span></>,
          <>Copy your <span className="text-neutral-300">Account SID</span> and <span className="text-neutral-300">Auth Token</span> from the dashboard</>,
          <>Pick a sending number under <span className="text-neutral-300">Phone Numbers</span></>,
          <>Save below as <span className="text-neutral-300">AccountSID:AuthToken</span> — reuse it across every Twilio step</>,
        ]}
      />
      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="rose"
        label="Account SID & Auth Token"
        placeholder="Select Twilio credential..."
      />
      <ConfigBanner>Store your Twilio credential as AccountSID:AuthToken (colon-separated).</ConfigBanner>

      <ConfigSelect
        label="Operation"
        value={operation}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {SHOW.to.includes(operation) && field('To', 'to', { placeholder: '+15551234567' })}
      {SHOW.from.includes(operation) && field('From (Twilio number)', 'from', { placeholder: '+15559876543' })}

      {SHOW.bodyMsg.includes(operation) && field('Message', 'body', { multiline: true })}
      {operation === 'sendMms' && field('Caption', 'body', { optional: true, multiline: true })}
      {SHOW.media.includes(operation) && field('Media URL', 'mediaUrl', {
        placeholder: 'https://example.com/image.jpg',
        hint: 'Publicly reachable https URL of the image/file to attach',
      })}

      {operation === 'makeCall' && field('TwiML URL', 'url', {
        placeholder: 'https://example.com/voice.xml',
        hint: 'URL returning TwiML that controls the call flow',
      })}

      {(operation === 'getMessage' || operation === 'deleteMessage') && field('Message SID', 'messageSid', { placeholder: 'SMxxxxxxxx' })}
      {(operation === 'getCall' || operation === 'hangupCall') && field('Call SID', 'callSid', { placeholder: 'CAxxxxxxxx' })}

      {SHOW.filterList.includes(operation) && (
        <>
          {field('Filter by To', 'to', { optional: true, placeholder: '+15551234567' })}
          {field('Filter by From', 'from', { optional: true, placeholder: '+15559876543' })}
        </>
      )}
      {operation === 'listCalls' && field('Filter by Status', 'status', { optional: true, placeholder: 'completed' })}
      {SHOW.maxResults.includes(operation) && (
        <ConfigInput label="Max Results" type="number" value={config.maxResults ?? 20} onChange={(v) => updateConfig('maxResults', Number(v))} />
      )}

      {SHOW.verify.includes(operation) && field('Verify Service SID', 'verifyServiceSid', {
        placeholder: 'VAxxxxxxxx',
        hint: 'From Twilio Verify — the service that owns this OTP flow',
      })}
      {operation === 'sendVerification' && (
        <ConfigPills
          label="Channel"
          value={config.channel || 'sms'}
          onChange={(v) => updateConfig('channel', v)}
          options={CHANNELS}
          accentColor={ACCENT}
        />
      )}
      {operation === 'checkVerification' && field('OTP Code', 'code', { placeholder: '123456' })}

      {operation === 'lookupNumber' && field('Phone Number', 'phoneNumber', {
        placeholder: '+15551234567',
        hint: 'E.164 format — returns carrier and line type info',
      })}
    </ConfigSection>
  );
}
