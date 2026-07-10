import imgIntercom from './logo.svg';
import {
  UserPlus, UserCog, User, Send, MessagesSquare, Reply, Tag, Activity,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'createContact',      label: 'Create Contact',       icon: UserPlus },
  { value: 'updateContact',      label: 'Update Contact',       icon: UserCog },
  { value: 'getContact',         label: 'Get Contact',          icon: User },
  { value: 'sendMessage',        label: 'Send Message',         icon: Send },
  { value: 'createConversation', label: 'New Conversation',     icon: MessagesSquare },
  { value: 'replyConversation',  label: 'Reply to Conversation', icon: Reply },
  { value: 'addTag',             label: 'Add Tag',              icon: Tag },
  { value: 'createEvent',        label: 'Track Event',          icon: Activity },
];

function Field({ label, optional, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
    </div>
  );
}

export default function IntercomNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'createContact';
  const currentOp = OPERATIONS.find((o) => o.value === op);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional}>
      <SmartVariableInput
        value={config[key] || ''}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader logoUrl={imgIntercom} title="Intercom" subtitle={currentOp?.label || 'Contacts, messages, conversations, events'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {['updateContact', 'getContact', 'sendMessage', 'addTag'].includes(op) &&
        text('Contact ID', 'contactId', { placeholder: '{{ $json.id }}' })}

      {(op === 'createContact' || op === 'updateContact') && (
        <>
          {text('Email', 'email', { placeholder: '{{ $json.email }}' })}
          {text('Name', 'name', { placeholder: '{{ $json.name }}' })}
          <ConfigPills
            label="Role"
            value={config.role || 'user'}
            onChange={(val) => updateConfig('role', val)}
            options={['user', 'lead']}
            accentColor={ACCENT}
          />
          {text('Custom Attributes (JSON)', 'customAttributes', { optional: true, placeholder: '{"plan":"pro","company":"Acme"}' })}
        </>
      )}

      {(op === 'sendMessage' || op === 'createConversation') && (
        <>
          {text('Message', 'body', { placeholder: 'Hi {{ $json.name }}, we noticed...', multiline: true })}
          <ConfigPills
            label="Message Type"
            value={config.messageType || 'inapp'}
            onChange={(val) => updateConfig('messageType', val)}
            options={[
              { value: 'inapp', label: 'In-app' },
              { value: 'email', label: 'Email' },
            ]}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'replyConversation' && (
        <>
          {text('Conversation ID', 'conversationId', { placeholder: '{{ $json.conversationId }}' })}
          {text('Reply Body', 'body', { placeholder: 'Thanks for reaching out...', multiline: true })}
        </>
      )}

      {op === 'addTag' && text('Tag Name', 'tagName', { placeholder: 'vip-customer' })}

      {op === 'createEvent' && (
        <>
          {text('Event Name', 'eventName', { placeholder: 'completed-onboarding' })}
          {text('User ID or Email', 'userId', { placeholder: '{{ $json.email }}' })}
          {text('Metadata (JSON)', 'metadata', { optional: true, placeholder: '{"plan":"pro","items":3}' })}
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Intercom Access Token"
        placeholder="Select Intercom credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300">id, type, email, name, created_at</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
