import { useEffect } from 'react';
import imgPipedrive from './logo.svg';
import {
  Plus, Pencil, Eye, List, UserPlus, UserCog, CalendarPlus, StickyNote, Search,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

export const OPERATIONS = [
  { value: 'createDeal',     label: 'Create Deal',     icon: Plus },
  { value: 'updateDeal',     label: 'Update Deal',     icon: Pencil },
  { value: 'getDeal',        label: 'Get Deal',        icon: Eye },
  { value: 'listDeals',      label: 'List Deals',      icon: List },
  { value: 'createPerson',   label: 'Create Person',   icon: UserPlus },
  { value: 'updatePerson',   label: 'Update Person',   icon: UserCog },
  { value: 'createActivity', label: 'Create Activity', icon: CalendarPlus },
  { value: 'createNote',     label: 'Create Note',     icon: StickyNote },
  { value: 'searchDeals',    label: 'Search Deals',    icon: Search },
];

const ACTIVITY_TYPES = ['call', 'meeting', 'task', 'email', 'lunch'];

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

export default function PipedriveNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const op = LABEL_TO_OP[config.selectedAction] || config.operation || 'createDeal';

  useEffect(() => {
    if (op && op !== config.operation) updateConfig('operation', op);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op]);
  const currentOp = OPERATIONS.find((o) => o.value === op);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional}>
      <SmartVariableInput
        value={opts.fallback !== undefined ? (config[key] || opts.fallback) : (config[key] || '')}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">


      {['updateDeal', 'getDeal'].includes(op) &&
        text('Deal ID', 'dealId', { placeholder: '{{ $json.id }}' })}

      {['updatePerson'].includes(op) &&
        text('Person ID', 'personId', { placeholder: '{{ $json.id }}' })}

      {(op === 'createDeal' || op === 'updateDeal') && (
        <>
          {text('Deal Title', 'title', { placeholder: '{{ $json.company }} - Enterprise Deal' })}
          <div className="flex gap-3">
            <div className="flex-1">{text('Value', 'value', { placeholder: '5000' })}</div>
            <div className="flex-1">{text('Currency', 'currency', { placeholder: 'USD', fallback: 'USD' })}</div>
          </div>
          {text('Expected Close Date (YYYY-MM-DD)', 'closeTime', { placeholder: '{{ $json.closeDate }}' })}
        </>
      )}

      {(op === 'createPerson' || op === 'updatePerson') && (
        <>
          {text('Name', 'name', { placeholder: '{{ $json.name }}' })}
          {text('Email', 'email', { placeholder: '{{ $json.email }}' })}
          {text('Phone', 'phone', { placeholder: '{{ $json.phone }}' })}
        </>
      )}

      {op === 'createActivity' && (
        <>
          {text('Subject', 'subject', { placeholder: 'Call with {{ $json.name }}' })}
          <ConfigPills
            label="Activity Type"
            value={config.type}
            onChange={(val) => updateConfig('type', val)}
            options={ACTIVITY_TYPES}
            accentColor={ACCENT}
          />
          {text('Due Date', 'dueDate', { placeholder: '2024-12-31' })}
        </>
      )}

      {op === 'createNote' && (
        <>
          {text('Note Content', 'content', { placeholder: '{{ $json.note }}', multiline: true })}
          {text('Attach to Deal ID', 'dealId', { optional: true, placeholder: '{{ $json.dealId }}' })}
        </>
      )}

      {op === 'searchDeals' &&
        text('Search Term', 'term', { placeholder: '{{ $json.company }}' })}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Pipedrive API Token"
        placeholder="Select Pipedrive credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">id, title, status, value, close_time</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
