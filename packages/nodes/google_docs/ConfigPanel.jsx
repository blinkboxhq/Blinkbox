import imgGoogleDocs from './logo.svg';
import { FilePlus, FileText, PlusSquare, Replace, Table, List, Download } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'createDoc',   label: 'Create Document',      icon: FilePlus },
  { value: 'getDoc',      label: 'Get Document',         icon: FileText },
  { value: 'appendText',  label: 'Append Text',          icon: PlusSquare },
  { value: 'replaceText', label: 'Find & Replace',       icon: Replace },
  { value: 'insertTable', label: 'Insert Table',         icon: Table },
  { value: 'listDocs',    label: 'List Documents',       icon: List },
  { value: 'exportDoc',   label: 'Export as PDF / DOCX', icon: Download },
];

const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'txt', label: 'TXT' },
  { value: 'html', label: 'HTML' },
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

export default function GoogleDocsNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'createDoc';
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
      <ConfigHeader logoUrl={imgGoogleDocs} title="Google Docs" subtitle={currentOp?.label || 'Create, read, edit Google Docs'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {['getDoc', 'appendText', 'replaceText', 'insertTable', 'exportDoc'].includes(op) &&
        text('Document ID', 'docId', { placeholder: '{{ $json.docId }} or from Drive URL' })}

      {op === 'createDoc' && (
        <>
          {text('Document Title', 'title', { placeholder: 'Weekly Report — {{ $json.week }}' })}
          {text('Initial Content', 'content', { optional: true, placeholder: '# Report\n\n{{ $json.summary }}', multiline: true })}
          {text('Parent Folder ID', 'folderId', { optional: true, placeholder: 'Drive folder ID' })}
        </>
      )}

      {op === 'appendText' && (
        <>
          {text('Text to Append', 'text', { placeholder: '{{ $json.entry }}', multiline: true })}
          <ConfigToggleRow
            label="Add timestamp prefix"
            on={!!config.addTimestamp}
            onChange={(v) => updateConfig('addTimestamp', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'replaceText' && (
        <>
          {text('Find Text', 'find', { placeholder: '{{PLACEHOLDER}}' })}
          {text('Replace With', 'replace', { placeholder: '{{ $json.value }}' })}
          <ConfigToggleRow
            label="Replace all occurrences"
            on={config.replaceAll !== false}
            onChange={(v) => updateConfig('replaceAll', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'exportDoc' && (
        <ConfigPills
          label="Export Format"
          value={config.format || 'pdf'}
          onChange={(val) => updateConfig('format', val)}
          options={FORMATS}
          accentColor={ACCENT}
        />
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="sky"
        label="Google OAuth"
        placeholder="Select Google credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">documentId, title, body, revisionId</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
