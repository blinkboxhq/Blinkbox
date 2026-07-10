import imgTypeform from './logo.svg';
import {
  List, FileText, Inbox, FileSearch, FilePlus2, Trash2,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'listForms',      label: 'List Forms',      icon: List },
  { value: 'getForm',        label: 'Get Form',        icon: FileText },
  { value: 'listResponses',  label: 'List Responses',  icon: Inbox },
  { value: 'getResponse',    label: 'Get Response',    icon: FileSearch },
  { value: 'createForm',     label: 'Create Form',     icon: FilePlus2 },
  { value: 'deleteResponse', label: 'Delete Response', icon: Trash2 },
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

export default function TypeformNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'listResponses';
  const currentOp = OPERATIONS.find((o) => o.value === op);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional}>
      <SmartVariableInput
        value={config[key] ?? opts.def ?? ''}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader logoUrl={imgTypeform} title="Typeform" subtitle={currentOp?.label || 'Forms & responses'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {op === 'listForms' && (
        <>
          <ConfigInput
            label="Page Size"
            type="number"
            value={config.listFormsPageSize ?? 10}
            onChange={(val) => updateConfig('listFormsPageSize', Number(val))}
          />
          {text('Search', 'search', { optional: true })}
        </>
      )}

      {['getForm', 'listResponses', 'getResponse', 'deleteResponse'].includes(op) &&
        text('Form ID', 'formId', {})}

      {op === 'listResponses' && (
        <>
          <ConfigInput
            label="Page Size"
            type="number"
            value={config.pageSize ?? 25}
            onChange={(val) => updateConfig('pageSize', Number(val))}
          />
          {text('Since (ISO date)', 'since', { optional: true, placeholder: '2024-01-01T00:00:00Z' })}
          {text('Until (ISO date)', 'until', { optional: true })}
          <ConfigToggleRow
            label="Completed Only"
            on={config.completedOnly ?? true}
            onChange={(v) => updateConfig('completedOnly', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {['getResponse', 'deleteResponse'].includes(op) && text('Response ID', 'responseId', {})}

      {op === 'createForm' && (
        <>
          {text('Form Title', 'title', {})}
          <Field label={<>Fields <span className="text-neutral-700 normal-case tracking-normal">(JSON array)</span></>}>
            <SmartVariableInput
              value={config.fields || ''}
              onChange={(val) => updateConfig('fields', val)}
              placeholder="JSON array of Typeform field objects"
              multiline
              nodeId={nodeId}
            />
          </Field>
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="zinc"
        label="Credential"
        placeholder="Select credential…"
      />

      <ConfigBanner>Returns:&nbsp;<span className="text-neutral-300">form, forms, response, responses</span></ConfigBanner>
    </ConfigSection>
  );
}
