import { useEffect } from 'react';
import imgAirtable from './logo.svg';
import {
  PlusCircle, Search, Pencil, Trash2, Download, Layers, Copy, Database, Table2, Columns3,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import OAuthConnectButton from '@/components/ui/OAuthConnectButton';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, ConfigBanner, AddRow, RemovableRow,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

export const OPERATIONS = [
  { value: 'create',      label: 'Create Record',  icon: PlusCircle, group: 'Records' },
  { value: 'read',        label: 'Read Records',   icon: Search,     group: 'Records' },
  { value: 'update',      label: 'Update Record',  icon: Pencil,     group: 'Records' },
  { value: 'delete',      label: 'Delete Record',  icon: Trash2,     group: 'Records' },
  { value: 'getRecord',   label: 'Get Record',     icon: Download,   group: 'Records' },
  { value: 'search',      label: 'Search Records', icon: Search,     group: 'Records' },
  { value: 'bulkCreate',  label: 'Bulk Create',    icon: Layers,     group: 'Bulk' },
  { value: 'bulkUpdate',  label: 'Bulk Update',    icon: Copy,       group: 'Bulk' },
  { value: 'bulkDelete',  label: 'Bulk Delete',    icon: Trash2,     group: 'Bulk' },
  { value: 'listBases',   label: 'List Bases',     icon: Database,   group: 'Schema' },
  { value: 'listTables',  label: 'List Tables',    icon: Table2,     group: 'Schema' },
  { value: 'createTable', label: 'Create Table',   icon: Table2,     group: 'Schema' },
  { value: 'createField', label: 'Create Field',   icon: Columns3,   group: 'Schema' },
];

const FIELD_TYPES = [
  'singleLineText', 'multilineText', 'email', 'url', 'phoneNumber', 'number',
  'currency', 'percent', 'checkbox', 'date', 'dateTime', 'singleSelect',
  'multipleSelects', 'rating', 'duration',
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

export default function AirtableNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const operation = LABEL_TO_OP[config.selectedAction] || config.operation || 'create';

  useEffect(() => {
    if (operation && operation !== config.operation) updateConfig('operation', operation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation]);
  const currentOp = OPERATIONS.find((o) => o.value === operation);
  const fields = config.fields || {};
  const fieldEntries = Object.entries(fields);

  const updateField = (oldKey, newKey, newValue) => {
    const newFields = { ...fields };
    if (oldKey !== newKey) delete newFields[oldKey];
    if (newKey) newFields[newKey] = newValue;
    updateConfig('fields', newFields);
  };
  const removeField = (key) => { const f = { ...fields }; delete f[key]; updateConfig('fields', f); };
  const addField = () => updateConfig('fields', { ...fields, ['Column']: '' });

  const needsRecordId = ['update', 'delete', 'getRecord'].includes(operation);
  const needsFields = ['create', 'update'].includes(operation);
  const needsFilter = ['read'].includes(operation);
  const isBulkRecords = ['bulkCreate', 'bulkUpdate'].includes(operation);
  const noBase = operation === 'listBases';
  const noTable = ['listBases', 'listTables', 'createTable', 'createField'].includes(operation);

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


      {!noBase && text('Base ID', 'baseId', { placeholder: 'appXXXXXXXXXXXXXX' })}
      {!noBase && !noTable && text('Table', 'tableName', { placeholder: 'Table name or ID' })}

      {needsRecordId && text('Record ID', 'recordId', { placeholder: 'recXXXXXXXXXXXXXX' })}

      {needsFields && (
        <Field label={<>Field Mapping</>}>
          <div className="flex flex-col gap-2">
            {fieldEntries.length === 0 ? (
              <ConfigBanner>No fields mapped yet.</ConfigBanner>
            ) : (
              fieldEntries.map(([k, v], i) => (
                <RemovableRow key={i} onRemove={() => removeField(k)}>
                  <div className="flex items-center gap-2">
                    <input value={k} onChange={(e) => updateField(k, e.target.value, v)} placeholder="Column"
                      className="w-1/3 bg-[#0f0f0f] border border-[#3b3b3b] rounded-md px-2.5 py-2 text-[12px] text-neutral-100 font-mono outline-none focus:border-[#545454] transition-colors" />
                    <div className="flex-1">
                      <SmartVariableInput nodeId={nodeId} value={v} onChange={(val) => updateField(k, k, val)} placeholder="Value" />
                    </div>
                  </div>
                </RemovableRow>
              ))
            )}
            <AddRow label="Add Field" onClick={addField} accentColor={ACCENT} />
          </div>
        </Field>
      )}

      {needsFilter && (
        <>
          {text('Filter Formula', 'filterFormula', { optional: true, placeholder: '{Status} = "Active"' })}
          <ConfigInput
            label="Max Records"
            type="number"
            value={config.maxRecords ?? 100}
            onChange={(val) => updateConfig('maxRecords', Number(val))}
          />
          {text('View', 'view', { optional: true, placeholder: 'Grid view' })}
        </>
      )}

      {operation === 'search' && (
        <>
          {text('Search Field', 'searchField', { placeholder: 'Email' })}
          {text('Search Value', 'searchValue', { placeholder: '{{trigger.data.email}}' })}
        </>
      )}

      {isBulkRecords && (
        <Field label={<>Records <span className="text-neutral-700 normal-case tracking-normal">(array, max 10)</span></>}>
          <SmartVariableInput
            nodeId={nodeId}
            value={typeof config.records === 'string' ? config.records : (config.records ? JSON.stringify(config.records, null, 2) : '')}
            onChange={(val) => { try { updateConfig('records', JSON.parse(val)); } catch { updateConfig('records', val); } }}
            placeholder={operation === 'bulkCreate'
              ? '[{"Name":"Alice"},{"Name":"Bob"}]'
              : '[{"id":"recXXX","fields":{"Status":"Done"}}]'}
            multiline
          />
          <ConfigBanner>
            {operation === 'bulkCreate' ? 'Array of field objects.' : 'Array of {id, fields} objects.'}
          </ConfigBanner>
        </Field>
      )}

      {operation === 'bulkDelete' && (
        <Field label={<>Record IDs <span className="text-neutral-700 normal-case tracking-normal">(comma-separated, max 10)</span></>}>
          <SmartVariableInput nodeId={nodeId}
            value={typeof config.recordIds === 'string' ? config.recordIds : (Array.isArray(config.recordIds) ? config.recordIds.join(', ') : '')}
            onChange={(val) => updateConfig('recordIds', val)}
            placeholder="recXXX, recYYY, recZZZ" />
        </Field>
      )}

      {operation === 'createTable' && (
        <>
          {text('New Table Name', 'newTableName', { placeholder: 'Customers' })}
          {text('Description', 'tableDescription', { optional: true, placeholder: 'What this table stores' })}
          <Field label={<>Fields <span className="text-neutral-700 normal-case tracking-normal">(array, optional — defaults to one "Name" text field)</span></>}>
            <SmartVariableInput nodeId={nodeId}
              value={typeof config.tableFields === 'string' ? config.tableFields : (config.tableFields ? JSON.stringify(config.tableFields, null, 2) : '')}
              onChange={(val) => { try { updateConfig('tableFields', JSON.parse(val)); } catch { updateConfig('tableFields', val); } }}
              placeholder='[{"name":"Name","type":"singleLineText"},{"name":"Score","type":"number","options":{"precision":0}}]'
              multiline />
          </Field>
        </>
      )}

      {operation === 'createField' && (
        <>
          {text('Table ID', 'tableId', { placeholder: 'tblXXXXXXXXXXXXXX' })}
          {text('Field Name', 'fieldName', { placeholder: 'Priority' })}
          <ConfigSelect
            label="Field Type"
            value={config.fieldType || 'singleLineText'}
            onChange={(val) => updateConfig('fieldType', val)}
            options={FIELD_TYPES}
            accentColor={ACCENT}
          />
        </>
      )}

      <OAuthConnectButton provider="airtable" providerLabel="Airtable" accentColor="blue"
        value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)} />
      <p className="text-[10px] text-zinc-600 -mt-3">Or use an existing credential:</p>
      <CredentialPicker value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue" label="Airtable Token" placeholder="Select Airtable credential..." />
    </ConfigSection>
  );
}
