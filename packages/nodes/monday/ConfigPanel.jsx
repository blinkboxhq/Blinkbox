import imgMonday from './logo.svg';
import {
  Plus, Columns3, Eye, List, Trash2, MessageSquarePlus, LayoutDashboard,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'createItem',   label: 'Create Item',   icon: Plus },
  { value: 'updateItem',   label: 'Update Column', icon: Columns3 },
  { value: 'getItem',      label: 'Get Item',      icon: Eye },
  { value: 'listItems',    label: 'List Items',    icon: List },
  { value: 'deleteItem',   label: 'Delete Item',   icon: Trash2 },
  { value: 'createUpdate', label: 'Post Update',   icon: MessageSquarePlus },
  { value: 'createBoard',  label: 'Create Board',  icon: LayoutDashboard },
];

const BOARD_KINDS = ['public', 'private', 'share'];

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

export default function MondayNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'createItem';
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
      <ConfigHeader logoUrl={imgMonday} title="Monday.com" subtitle={currentOp?.label || 'Items, boards, columns, updates'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {['createItem', 'listItems', 'createBoard'].indexOf(op) === -1 && op !== 'createBoard' &&
        text('Item ID', 'itemId', { placeholder: '{{ $json.id }}' })}

      {['createItem', 'listItems'].includes(op) &&
        text('Board ID', 'boardId', { placeholder: 'Monday board ID' })}

      {op === 'createItem' && (
        <>
          {text('Item Name', 'itemName', { placeholder: '{{ $json.name }}' })}
          {text('Column Values (JSON)', 'columnValues', {
            placeholder: '{"status":{"label":"Done"},"date4":{"date":"2024-01-01"}}',
            multiline: true,
          })}
        </>
      )}

      {op === 'updateItem' && (
        <>
          {text('Column ID', 'columnId', { placeholder: 'status' })}
          {text('Value (JSON)', 'value', { placeholder: '{"label":"Done"}' })}
        </>
      )}

      {op === 'createUpdate' &&
        text('Update Body', 'body', { placeholder: 'Status update: {{ $json.message }}', multiline: true })}

      {op === 'createBoard' && (
        <>
          {text('Board Name', 'boardName', { placeholder: 'Q3 Roadmap' })}
          <ConfigPills
            label="Board Kind"
            value={config.boardKind || 'public'}
            onChange={(val) => updateConfig('boardKind', val)}
            options={BOARD_KINDS}
            accentColor={ACCENT}
          />
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Monday.com API Token"
        placeholder="Select Monday credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">id, name, board_id, column_values, created_at</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
