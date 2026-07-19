import imgDrive from './logo.svg';
import {
  Files, Search, Eye, FolderPlus, Upload, Download, FileOutput, Copy, Pencil,
  FilePenLine, MoveRight, Trash2, Trash, RotateCcw, Star, Share2, Link2, Users,
  UserCog, UserMinus, HardDrive, Gauge,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import OAuthConnectButton from '@/components/ui/OAuthConnectButton';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigInput, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'listFiles',         label: 'List Files',     icon: Files },
  { value: 'search',            label: 'Search',         icon: Search },
  { value: 'getFile',           label: 'Get File',       icon: Eye },
  { value: 'createFolder',      label: 'Create Folder',  icon: FolderPlus },
  { value: 'uploadText',        label: 'Upload Text',    icon: Upload },
  { value: 'downloadText',      label: 'Download Text',  icon: Download },
  { value: 'exportFile',        label: 'Export (Docs)',  icon: FileOutput },
  { value: 'copyFile',          label: 'Copy File',      icon: Copy },
  { value: 'renameFile',        label: 'Rename File',    icon: Pencil },
  { value: 'updateFileContent', label: 'Update Content', icon: FilePenLine },
  { value: 'moveFile',          label: 'Move File',      icon: MoveRight },
  { value: 'starFile',          label: 'Star / Unstar',  icon: Star },
  { value: 'deleteFile',        label: 'Delete Forever', icon: Trash2 },
  { value: 'trashFile',         label: 'Move to Trash',  icon: Trash },
  { value: 'restoreFile',       label: 'Restore',        icon: RotateCcw },
  { value: 'emptyTrash',        label: 'Empty Trash',    icon: Trash2 },
  { value: 'shareFile',         label: 'Share File',     icon: Share2 },
  { value: 'createSharedLink',  label: 'Shared Link',    icon: Link2 },
  { value: 'listPermissions',   label: 'List Access',    icon: Users },
  { value: 'updatePermission',  label: 'Update Access',  icon: UserCog },
  { value: 'removePermission',  label: 'Remove Access',  icon: UserMinus },
  { value: 'listDrives',        label: 'List Drives',    icon: HardDrive },
  { value: 'getAbout',          label: 'Storage Info',   icon: Gauge },
];

const FILE_ID_OPS = ['getFile', 'downloadText', 'exportFile', 'copyFile', 'renameFile', 'updateFileContent', 'deleteFile', 'trashFile', 'restoreFile', 'starFile', 'shareFile', 'createSharedLink', 'listPermissions', 'updatePermission', 'removePermission'];
const ROLE_PILLS = [
  { value: 'reader', label: 'Reader' },
  { value: 'commenter', label: 'Commenter' },
  { value: 'writer', label: 'Writer' },
  { value: 'owner', label: 'Owner' },
];

function DriveIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7.71 3.5L1.15 15l3.43 5.5h15.84l3.43-5.5L17.29 3.5H7.71zM12 5.5l4.16 7H7.84L12 5.5zm-7.45 10l1.74-3h11.42l1.74 3H4.55z" />
    </svg>
  );
}

function Field({ label, optional, hint, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
      {hint && <p className="text-[10px] text-neutral-600 mt-1.5">{hint}</p>}
    </div>
  );
}

export default function GoogleDriveNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'listFiles';
  const currentOp = OPERATIONS.find((o) => o.value === op);
  const set = (k) => (v) => updateConfig(k, v);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional} hint={opts.hint}>
      <SmartVariableInput
        value={config[key] || ''}
        onChange={set(key)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader logoUrl={imgDrive} title="Google Drive" subtitle={currentOp?.label || 'Files, folders, trash, sharing & account'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {op === 'listFiles' && (
        <>
          {text('Folder ID', 'folderId', { optional: true, placeholder: 'root', hint: 'Blank = "My Drive" root' })}
          {text('MIME Type Filter', 'mimeType', { optional: true, placeholder: 'application/pdf' })}
          <ConfigInput label="Limit" type="number" value={config.limit ?? 50} onChange={(v) => updateConfig('limit', Number(v))} />
        </>
      )}

      {op === 'search' && (
        <>
          {text('Query', 'query', { placeholder: 'quarterly report' })}
          <ConfigToggleRow
            label="Search inside file contents"
            on={!!config.searchContent}
            onChange={(v) => updateConfig('searchContent', v)}
            accentColor={ACCENT}
          />
          <ConfigInput label="Limit" type="number" value={config.limit ?? 50} onChange={(v) => updateConfig('limit', Number(v))} />
        </>
      )}

      {FILE_ID_OPS.includes(op) && text('File ID', 'fileId', { placeholder: '{{n1.id}}' })}

      {op === 'createFolder' && (
        <>
          {text('Folder Name', 'name', { placeholder: 'Reports 2024' })}
          {text('Parent Folder ID', 'parentId', { optional: true, placeholder: 'root' })}
        </>
      )}

      {op === 'uploadText' && (
        <>
          {text('File Name', 'name', { placeholder: 'report.csv' })}
          {text('Content', 'content', { placeholder: '{{n1.csv}}', multiline: true })}
          {text('MIME Type', 'mimeType', { optional: true, placeholder: 'text/csv' })}
          {text('Folder ID', 'folderId', { optional: true, placeholder: 'root' })}
        </>
      )}

      {op === 'updateFileContent' && (
        <>
          {text('New Content', 'content', { placeholder: '{{n1.text}}', multiline: true })}
          {text('MIME Type', 'mimeType', { optional: true, placeholder: 'text/plain' })}
        </>
      )}

      {op === 'exportFile' &&
        text('Export MIME Type', 'exportMimeType', { placeholder: 'application/pdf', hint: 'e.g. application/pdf, text/plain, text/csv' })}

      {op === 'copyFile' && (
        <>
          {text('New Name', 'name', { optional: true, placeholder: 'Copy of report' })}
          {text('Destination Folder ID', 'parentId', { optional: true, placeholder: 'root' })}
        </>
      )}

      {op === 'renameFile' && text('New Name', 'name', { placeholder: 'final-report.pdf' })}

      {op === 'moveFile' && (
        <>
          {text('File ID', 'fileId', { placeholder: '{{n1.id}}' })}
          {text('Target Folder ID', 'targetFolderId', { placeholder: '{{n1.folderId}}' })}
        </>
      )}

      {op === 'starFile' && (
        <ConfigToggleRow
          label="Starred"
          on={config.starred !== false}
          onChange={(v) => updateConfig('starred', v)}
          accentColor={ACCENT}
        />
      )}

      {op === 'shareFile' && (
        <>
          <ConfigPills
            label="Share With"
            value={config.shareType || 'user'}
            onChange={(v) => updateConfig('shareType', v)}
            options={[
              { value: 'user', label: 'User' },
              { value: 'group', label: 'Group' },
              { value: 'domain', label: 'Domain' },
              { value: 'anyone', label: 'Anyone' },
            ]}
            accentColor={ACCENT}
          />
          {['user', 'group'].includes(config.shareType || 'user') &&
            text('Email', 'email', { placeholder: 'colleague@example.com' })}
          {config.shareType === 'domain' && text('Domain', 'domain', { placeholder: 'example.com' })}
          <ConfigPills
            label="Role"
            value={config.role || 'reader'}
            onChange={(v) => updateConfig('role', v)}
            options={ROLE_PILLS}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'createSharedLink' && (
        <ConfigPills
          label="Link Role"
          value={config.role || 'reader'}
          onChange={(v) => updateConfig('role', v)}
          options={[
            { value: 'reader', label: 'Reader' },
            { value: 'commenter', label: 'Commenter' },
            { value: 'writer', label: 'Writer' },
          ]}
          accentColor={ACCENT}
        />
      )}

      {['updatePermission', 'removePermission'].includes(op) &&
        text('Permission ID', 'permissionId', { placeholder: '{{n1.permissions[0].id}}', hint: 'From a List Access run' })}

      {op === 'updatePermission' && (
        <ConfigPills
          label="New Role"
          value={config.role || 'reader'}
          onChange={(v) => updateConfig('role', v)}
          options={ROLE_PILLS}
          accentColor={ACCENT}
        />
      )}

      {op === 'emptyTrash' && (
        <ConfigBanner tone="warn">
          Permanently deletes every file in trash. This cannot be undone.
        </ConfigBanner>
      )}

      <OAuthConnectButton provider="google" providerLabel="Google" accentColor="blue"
        value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)} icon={DriveIcon} />
      <p className="text-[10px] text-neutral-600 -mt-3">Or use an existing credential:</p>
      <CredentialPicker value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue" label="Google OAuth Token" placeholder="Select Google credential..." />
    </ConfigSection>
  );
}
