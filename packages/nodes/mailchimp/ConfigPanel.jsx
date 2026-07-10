import imgMailchimp from './logo.svg';
import {
  UserPlus, UserMinus, User, List, Send, FilePlus2, Tag, Users,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'addSubscriber',    label: 'Add / Update Subscriber', icon: UserPlus },
  { value: 'removeSubscriber', label: 'Unsubscribe',             icon: UserMinus },
  { value: 'getSubscriber',    label: 'Get Subscriber',          icon: User },
  { value: 'listCampaigns',    label: 'List Campaigns',          icon: List },
  { value: 'sendCampaign',     label: 'Send Campaign',           icon: Send },
  { value: 'createCampaign',   label: 'Create Campaign',         icon: FilePlus2 },
  { value: 'addTag',           label: 'Add Tag to Subscriber',   icon: Tag },
  { value: 'listLists',        label: 'List Audiences',          icon: Users },
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

export default function MailchimpNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'addSubscriber';
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
      <ConfigHeader logoUrl={imgMailchimp} title="Mailchimp" subtitle={currentOp?.label || 'Subscribers, lists, campaigns, tags'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {!['listCampaigns', 'createCampaign', 'listLists'].includes(op) &&
        text('Audience (List) ID', 'listId', { placeholder: 'Mailchimp audience ID' })}

      {(op === 'addSubscriber' || op === 'getSubscriber' || op === 'removeSubscriber' || op === 'addTag') &&
        text('Email Address', 'email', { placeholder: '{{ $json.email }}' })}

      {op === 'addSubscriber' && (
        <>
          <div className="flex gap-3">
            <div className="flex-1">{text('First Name', 'firstName', { placeholder: '{{ $json.firstName }}' })}</div>
            <div className="flex-1">{text('Last Name', 'lastName', { placeholder: '{{ $json.lastName }}' })}</div>
          </div>
          <ConfigPills
            label="Status"
            value={config.status || 'subscribed'}
            onChange={(val) => updateConfig('status', val)}
            options={['subscribed', 'pending', 'unsubscribed']}
            accentColor={ACCENT}
          />
          {text('Tags (comma-sep)', 'tags', { optional: true, placeholder: 'vip,new-user' })}
          <ConfigToggleRow
            label="Update if exists"
            on={config.updateExisting !== false}
            onChange={(v) => updateConfig('updateExisting', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'addTag' && text('Tag Name', 'tagName', { placeholder: 'premium-user' })}

      {op === 'sendCampaign' && text('Campaign ID', 'campaignId', { placeholder: '{{ $json.id }}' })}

      {op === 'createCampaign' && (
        <>
          <ConfigPills
            label="Campaign Type"
            value={config.type || 'regular'}
            onChange={(val) => updateConfig('type', val)}
            options={['regular', 'plaintext', 'rss', 'variate']}
            accentColor={ACCENT}
          />
          {text('Audience ID', 'listId', { placeholder: 'Mailchimp audience ID' })}
          {text('Subject Line', 'subjectLine', { placeholder: 'Your {{ $json.month }} newsletter is here!' })}
          {text('From Name', 'fromName', { placeholder: 'My Company' })}
          {text('Reply-To Email', 'replyTo', { placeholder: 'hello@mycompany.com' })}
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="zinc"
        label="Mailchimp API Key"
        placeholder="Select Mailchimp credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300">id, email_address, status, list_id, timestamp_signup</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
