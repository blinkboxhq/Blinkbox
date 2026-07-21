import { useEffect } from 'react';
import imgSendGrid from './logo.svg';
import { Send, Layout, Users, UserPlus, Search, UserSearch, UserX, List, ListPlus, ListX, Files, FileSearch, ShieldCheck, BarChart3, Ban } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, ConfigPills, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

export const OPERATIONS = [
  { value: 'sendEmail',         label: 'Send Email',         icon: Send },
  { value: 'sendTemplate',      label: 'Use Template',       icon: Layout },
  { value: 'sendBulk',          label: 'Bulk Send',          icon: Users },
  { value: 'addContact',        label: 'Add Contact',        icon: UserPlus },
  { value: 'getContact',        label: 'Get Contact',        icon: UserSearch },
  { value: 'searchContacts',    label: 'Search Contacts',    icon: Search },
  { value: 'deleteContact',     label: 'Delete Contact',     icon: UserX },
  { value: 'listLists',         label: 'List Lists',         icon: List },
  { value: 'createList',        label: 'Create List',        icon: ListPlus },
  { value: 'deleteList',        label: 'Delete List',        icon: ListX },
  { value: 'listTemplates',     label: 'List Templates',     icon: Files },
  { value: 'getTemplate',       label: 'Get Template',       icon: FileSearch },
  { value: 'validateEmail',     label: 'Validate Email',     icon: ShieldCheck },
  { value: 'getStats',          label: 'Get Stats',          icon: BarChart3 },
  { value: 'listSuppressions',  label: 'List Suppressions',  icon: Ban },
  { value: 'deleteSuppression', label: 'Remove Suppression', icon: UserX },
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

export default function SendGridNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const operation = LABEL_TO_OP[config.selectedAction] || config.operation || 'sendEmail';

  useEffect(() => {
    if (operation && operation !== config.operation) updateConfig('operation', operation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation]);
  const currentOp = OPERATIONS.find((o) => o.value === operation);
  const isEmail = ['sendEmail', 'sendTemplate', 'sendBulk'].includes(operation);

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

  const jsonField = (label, key, placeholder) => (
    <Field label={label}>
      <SmartVariableInput
        value={typeof config[key] === 'string' ? config[key] : (config[key] ? JSON.stringify(config[key]) : '')}
        onChange={(val) => { try { updateConfig(key, JSON.parse(val)); } catch { updateConfig(key, val); } }}
        placeholder={placeholder}
        multiline
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">


      {isEmail && (
        <>
          {operation === 'sendBulk'
            ? jsonField('Recipients (JSON array)', 'recipients', '[{"email":"a@b.com","name":"Alice"},{"email":"c@d.com"}]')
            : text('To', 'to', { placeholder: '{{trigger.data.email}}' })}
          {text('From', 'from', { placeholder: 'Your Name <noreply@yourapp.com>' })}
          {operation !== 'sendTemplate' &&
            text('Subject', 'subject', { placeholder: 'Welcome to {{trigger.data.company}}!' })}
        </>
      )}

      {operation === 'sendEmail' &&
        text('Body', 'body', { placeholder: 'Hello {{trigger.data.name}}, ...', multiline: true })}

      {operation === 'sendTemplate' && (
        <>
          <ConfigInput
            label="Template ID"
            value={config.templateId || ''}
            onChange={(val) => updateConfig('templateId', val)}
            placeholder="d-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          />
          {jsonField('Dynamic Data (JSON)', 'dynamicData', '{"name": "{{trigger.data.name}}", "plan": "Pro"}')}
        </>
      )}

      {operation === 'addContact' && (
        <>
          {text('Email', 'email', { placeholder: '{{trigger.data.email}}' })}
          <div className="grid grid-cols-2 gap-2">
            {text('First Name', 'firstName', { placeholder: '{{trigger.data.firstName}}' })}
            {text('Last Name', 'lastName', { placeholder: '{{trigger.data.lastName}}' })}
          </div>
          <ConfigInput
            label="List ID (optional)"
            value={config.listIds || ''}
            onChange={(val) => updateConfig('listIds', val)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </>
      )}

      {operation === 'getContact' && (
        <>
          {text('Contact ID', 'contactId', { optional: true, placeholder: 'xxxxxxxx-xxxx-...' })}
          {text('Email', 'email', { optional: true, placeholder: '{{trigger.data.email}}' })}
        </>
      )}

      {operation === 'searchContacts' && (
        <Field label="SGQL Query">
          <SmartVariableInput value={config.query || ''} onChange={(val) => updateConfig('query', val)} placeholder="email LIKE '%@example.com'" multiline nodeId={nodeId} />
          <p className="text-[10px] text-neutral-600 mt-1.5">SendGrid Query Language — e.g. email LIKE '%@acme.com' AND last_name = 'Doe'</p>
        </Field>
      )}

      {operation === 'deleteContact' && text('Contact ID', 'contactId', { placeholder: 'xxxxxxxx-xxxx-...' })}

      {operation === 'createList' && text('List Name', 'listName', { placeholder: 'Newsletter Subscribers' })}

      {operation === 'deleteList' && text('List ID', 'listId', { placeholder: 'xxxxxxxx-xxxx-...' })}

      {operation === 'getTemplate' && (
        <ConfigInput
          label="Template ID"
          value={config.templateId || ''}
          onChange={(val) => updateConfig('templateId', val)}
          placeholder="d-XXXXXXXX..."
        />
      )}

      {operation === 'validateEmail' && text('Email', 'email', { placeholder: '{{trigger.data.email}}' })}

      {operation === 'getStats' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <ConfigInput label="Start Date" type="date" value={config.startDate || ''} onChange={(val) => updateConfig('startDate', val)} />
            <ConfigInput label="End Date (optional)" type="date" value={config.endDate || ''} onChange={(val) => updateConfig('endDate', val)} />
          </div>
          <ConfigPills
            label="Aggregate By"
            value={config.aggregatedBy || 'day'}
            onChange={(val) => updateConfig('aggregatedBy', val)}
            options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]}
            accentColor={ACCENT}
          />
        </>
      )}

      {(operation === 'listSuppressions' || operation === 'deleteSuppression') && (
        <ConfigSelect
          label="Suppression Type"
          value={config.suppressionType || 'bounces'}
          onChange={(val) => updateConfig('suppressionType', val)}
          options={[
            { value: 'bounces', label: 'Bounces' },
            { value: 'blocks', label: 'Blocks' },
            { value: 'spam_reports', label: 'Spam Reports' },
            { value: 'invalid_emails', label: 'Invalid Emails' },
            { value: 'unsubscribes', label: 'Unsubscribes' },
          ]}
          accentColor={ACCENT}
        />
      )}
      {operation === 'deleteSuppression' && text('Email', 'email', { placeholder: '{{trigger.data.email}}' })}

      {(operation === 'listLists' || operation === 'listTemplates') && (
        <ConfigInput
          label="Max Results"
          type="number"
          value={config.maxResults ?? 50}
          onChange={(val) => updateConfig('maxResults', Number(val))}
        />
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="SendGrid API Key"
        placeholder="Select SendGrid credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">statusCode, messageId, contacts[ ], stats</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
