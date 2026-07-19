import { useEffect } from 'react';
import imgSharePoint from './logo.svg';
import {
  LayoutGrid, List, UploadCloud, DownloadCloud, FolderPlus, Trash2, Search,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'listSites',    label: 'List Sites',    icon: LayoutGrid },
  { value: 'listFiles',    label: 'List Files',    icon: List },
  { value: 'uploadFile',   label: 'Upload File',   icon: UploadCloud },
  { value: 'downloadFile', label: 'Download File', icon: DownloadCloud },
  { value: 'createFolder', label: 'Create Folder', icon: FolderPlus },
  { value: 'deleteFile',   label: 'Delete File',   icon: Trash2 },
  { value: 'searchFiles',  label: 'Search Files',  icon: Search },
];

const FILE_OPS = ['listFiles', 'uploadFile', 'downloadFile', 'createFolder', 'deleteFile', 'searchFiles'];

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

export default function SharePointNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const op = LABEL_TO_OP[config.selectedAction] || config.operation || 'listFiles';

  useEffect(() => {
    if (op && op !== config.operation) updateConfig('operation', op);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op]);
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


      {text('Site ID', 'siteId', { optional: true, placeholder: 'Leave blank to use root site' })}

      {op === 'listSites' && (
        <ConfigInput
          label="Limit"
          type="number"
          value={config.limit ?? 20}
          onChange={(val) => updateConfig('limit', Number(val))}
        />
      )}

      {FILE_OPS.includes(op) && text('Drive ID', 'driveId', {})}

      {op === 'listFiles' && text('Folder ID', 'folderId', { def: 'root' })}

      {op === 'uploadFile' && (
        <>
          {text('File Name', 'fileName', {})}
          {text('File Content', 'content', { multiline: true })}
        </>
      )}

      {['uploadFile', 'createFolder'].includes(op) && text('Parent Folder ID', 'parentFolderId', { def: 'root' })}

      {['downloadFile', 'deleteFile'].includes(op) && text('Item ID', 'itemId', {})}

      {op === 'createFolder' && text('Folder Name', 'name', {})}

      {op === 'searchFiles' && text('Search Query', 'query', {})}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Microsoft Credential"
        placeholder="Select credential…"
      />

      <ConfigBanner>Returns:&nbsp;<span className="text-neutral-300">sites, files, file, folder, url</span></ConfigBanner>
    </ConfigSection>
  );
}
