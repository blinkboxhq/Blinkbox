import imgGoogleForms from './logo.svg';
import { FileText, ListChecks, FileSearch, FilePlus, CirclePlus } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'getForm',       label: 'Get Form',       icon: FileText },
  { value: 'listResponses', label: 'List Responses', icon: ListChecks },
  { value: 'getResponse',   label: 'Get Response',   icon: FileSearch },
  { value: 'createForm',    label: 'Create Form',    icon: FilePlus },
  { value: 'addQuestion',   label: 'Add Question',   icon: CirclePlus },
];

const QUESTION_TYPES = [
  { value: 'TEXT',            label: 'Short Text' },
  { value: 'PARAGRAPH_TEXT',  label: 'Long Text' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'CHECKBOX',        label: 'Checkbox' },
  { value: 'DROPDOWN',        label: 'Dropdown' },
  { value: 'SCALE',           label: 'Linear Scale' },
  { value: 'DATE',            label: 'Date' },
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

export default function GoogleFormsNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'listResponses';
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
      <ConfigHeader logoUrl={imgGoogleForms} title="Google Forms" subtitle={currentOp?.label || 'Forms, responses, questions'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {['getForm', 'listResponses', 'getResponse', 'addQuestion'].includes(op) &&
        text('Form ID', 'formId', { placeholder: 'From Google Forms URL' })}

      {op === 'getResponse' && text('Response ID', 'responseId', { placeholder: '{{ $json.responseId }}' })}

      {op === 'listResponses' && (
        <>
          {text('Page Size', 'pageSize', { placeholder: '50' })}
          <ConfigToggleRow
            label="Include questions in output"
            on={!!config.includeQuestions}
            onChange={(v) => updateConfig('includeQuestions', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'createForm' && (
        <>
          {text('Form Title', 'title', { placeholder: 'Customer Feedback Survey' })}
          {text('Description', 'description', { optional: true, placeholder: 'Please answer a few quick questions.' })}
        </>
      )}

      {op === 'addQuestion' && (
        <>
          <ConfigSelect
            label="Question Type"
            value={config.questionType || 'TEXT'}
            onChange={(val) => updateConfig('questionType', val)}
            options={QUESTION_TYPES}
            accentColor={ACCENT}
          />
          {text('Question Text', 'questionText', { placeholder: 'What is your biggest challenge?' })}
          {['MULTIPLE_CHOICE', 'CHECKBOX', 'DROPDOWN'].includes(config.questionType) &&
            text('Options (one per line)', 'options', { placeholder: 'Option A\nOption B\nOption C', multiline: true })}
          <ConfigToggleRow
            label="Required"
            on={!!config.required}
            onChange={(v) => updateConfig('required', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="purple"
        label="Google OAuth"
        placeholder="Select Google credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">formId, responses[ ], answers, respondentEmail</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
