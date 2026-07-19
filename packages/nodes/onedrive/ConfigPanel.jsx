import { useEffect } from 'react';
import imgOneDrive from './logo.svg';
import {
  UploadCloud, DownloadCloud, List, Trash2, FolderPlus, FolderInput, Link2, Info,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'uploadFile',   label: 'Upload File',       icon: UploadCloud },
  { value: 'downloadFile', label: 'Download File',     icon: DownloadCloud },
  { value: 'listFiles',    label: 'List Files',        icon: List },
  { value: 'deleteFile',   label: 'Delete File',       icon: Trash2 },
  { value: 'createFolder', label: 'Create Folder',     icon: FolderPlus },
  { value: 'moveFile',     label: 'Move / Rename',     icon: FolderInput },
  { value: 'shareFile',    label: 'Create Share Link', icon: Link2 },
  { value: 'getFileInfo',  label: 'Get File Info',     icon: Info },
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

export default function OneDriveNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const op = LABEL_TO_OP[config.selectedAction] || config.operation || 'uploadFile';

  useEffect(() => {
    if (op && op !== config.operation) updateConfig('operation', op);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op]);
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


      {op === 'uploadFile' && (
        <>
          {text('Destination Path', 'path', { placeholder: '/reports/{{ $json.filename }}' })}
          {text('File Content (base64 or URL)', 'content', { placeholder: '{{ $json.fileBase64 }}' })}
          <ConfigToggleRow
            label="Overwrite if exists"
            on={config.overwrite}
            onChange={(v) => updateConfig('overwrite', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {['downloadFile', 'deleteFile', 'shareFile', 'getFileInfo'].includes(op) &&
        text('File Path or Item ID', 'path', { placeholder: '/documents/report.pdf or item ID' })}

      {op === 'listFiles' &&
        text('Folder Path', 'folderPath', { optional: true, placeholder: '/reports/q3' })}

      {op === 'createFolder' &&
        text('Folder Path', 'folderPath', { placeholder: '/reports/{{ $json.month }}' })}

      {op === 'moveFile' && (
        <>
          {text('Source Path', 'sourcePath', { placeholder: '/inbox/file.pdf' })}
          {text('Destination Path', 'destPath', { placeholder: '/archive/file.pdf' })}
          {text('New Name', 'newName', { optional: true, placeholder: 'report-final.pdf' })}
        </>
      )}

      {op === 'shareFile' && (
        <>
          <ConfigPills
            label="Link Type"
            value={config.linkType || 'view'}
            onChange={(val) => updateConfig('linkType', val)}
            options={[{ value: 'view', label: 'view' }, { value: 'edit', label: 'edit' }, { value: 'embed', label: 'embed' }]}
            accentColor={ACCENT}
          />
          <ConfigPills
            label="Scope"
            value={config.scope || 'anonymous'}
            onChange={(val) => updateConfig('scope', val)}
            options={[{ value: 'anonymous', label: 'anonymous' }, { value: 'organization', label: 'organization' }]}
            accentColor={ACCENT}
          />
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Microsoft 365 (OAuth)"
        placeholder="Select OneDrive credential..."
      />

      <ConfigBanner>Returns:&nbsp;<span className="text-neutral-300">id, name, size, webUrl, createdDateTime</span></ConfigBanner>
    </ConfigSection>
  );
}
