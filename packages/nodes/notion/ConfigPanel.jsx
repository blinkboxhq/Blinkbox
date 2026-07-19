import { useEffect } from 'react';
import imgNotion from '@/assets/notion.svg';
import { PlusCircle, Edit3, Database, FileText, AlignLeft, Search, Trash2, RotateCcw, Box, MessageSquare, Users, User } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigInput, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';
const jsonVal = (v) => (typeof v === 'string' ? v : (v ? JSON.stringify(v, null, 2) : ''));

const OPERATIONS = [
  { value: 'createPage',      label: 'Create Page',    icon: PlusCircle },
  { value: 'updatePage',      label: 'Update Page',    icon: Edit3 },
  { value: 'getPage',         label: 'Get Page',       icon: FileText },
  { value: 'deletePage',      label: 'Archive Page',   icon: Trash2 },
  { value: 'restorePage',     label: 'Restore Page',   icon: RotateCcw },
  { value: 'queryDatabase',   label: 'Query DB',       icon: Database },
  { value: 'createDatabase',  label: 'Create DB',      icon: PlusCircle },
  { value: 'getDatabase',     label: 'Get DB',         icon: Database },
  { value: 'updateDatabase',  label: 'Update DB',      icon: Edit3 },
  { value: 'appendBlock',     label: 'Append Content', icon: AlignLeft },
  { value: 'getBlockChildren',label: 'List Blocks',    icon: Box },
  { value: 'getBlock',        label: 'Get Block',      icon: Box },
  { value: 'updateBlock',     label: 'Update Block',   icon: Edit3 },
  { value: 'deleteBlock',     label: 'Delete Block',   icon: Trash2 },
  { value: 'searchPages',     label: 'Search',         icon: Search },
  { value: 'listUsers',       label: 'List Users',     icon: Users },
  { value: 'getUser',         label: 'Get User',       icon: User },
  { value: 'createComment',   label: 'Add Comment',    icon: MessageSquare },
  { value: 'getComments',     label: 'Get Comments',   icon: MessageSquare },
];

const BLOCK_TYPES = ['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'to_do'];

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

export default function NotionNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const operation = LABEL_TO_OP[config.selectedAction] || config.operation || 'createPage';

  useEffect(() => {
    if (operation && operation !== config.operation) updateConfig('operation', operation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation]);
  const currentOp = OPERATIONS.find((o) => o.value === operation);

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

  const jsonField = (label, key, placeholder, optional) => (
    <Field label={label} optional={optional}>
      <SmartVariableInput
        value={jsonVal(config[key])}
        onChange={(val) => { try { updateConfig(key, JSON.parse(val)); } catch { updateConfig(key, val); } }}
        placeholder={placeholder}
        multiline
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">


      {operation === 'createPage' && (
        <>
          {text('Parent', 'parentId', { placeholder: 'Database or page ID / URL' })}
          <ConfigToggleRow
            label="Parent is a page"
            desc="Off = create inside a database"
            on={config.parentType === 'page'}
            onChange={(v) => updateConfig('parentType', v ? 'page' : 'database')}
            accentColor={ACCENT}
          />
          {text('Title', 'title', { optional: true, placeholder: 'My New Page' })}
          {jsonField('Properties (JSON)', 'properties', '{"Status": {"select": {"name": "Active"}}}', true)}
          {text('Content', 'content', { optional: true, placeholder: 'Page body text...', multiline: true })}
        </>
      )}

      {operation === 'updatePage' && (
        <>
          {text('Page ID', 'pageId', { placeholder: '{{trigger.data.pageId}}' })}
          {jsonField('Properties (JSON)', 'properties', '{"Status": {"select": {"name": "Done"}}}')}
        </>
      )}

      {operation === 'queryDatabase' && (
        <>
          {text('Database ID', 'databaseId', { placeholder: 'Database ID or URL' })}
          {jsonField('Filter (JSON)', 'filter', '{"property": "Status", "select": {"equals": "Active"}}', true)}
          <ConfigInput
            label="Page Size"
            type="number"
            value={config.pageSize ?? 10}
            onChange={(val) => updateConfig('pageSize', Number(val))}
          />
        </>
      )}

      {['getPage', 'deletePage', 'restorePage'].includes(operation) &&
        text('Page ID', 'pageId', { placeholder: '{{trigger.data.pageId}}' })}

      {operation === 'createDatabase' && (
        <>
          {text('Parent Page ID', 'parentId', { placeholder: 'Parent page ID / URL' })}
          {text('Title', 'title', { placeholder: 'Tasks' })}
          {jsonField('Properties (JSON)', 'properties', '{"Name":{"title":{}},"Status":{"select":{"options":[{"name":"Open"}]}}}', true)}
        </>
      )}

      {['getDatabase', 'updateDatabase'].includes(operation) && (
        <>
          {text('Database ID', 'databaseId', { placeholder: 'Database ID or URL' })}
          {operation === 'updateDatabase' && (
            <>
              {text('New Title', 'title', { optional: true, placeholder: 'Renamed DB' })}
              {jsonField('Properties (JSON)', 'properties', '{"Priority":{"select":{"options":[{"name":"High"}]}}}', true)}
            </>
          )}
        </>
      )}

      {['getBlockChildren', 'getBlock', 'updateBlock', 'deleteBlock'].includes(operation) &&
        text(operation === 'getBlockChildren' ? 'Page / Block ID' : 'Block ID', 'blockId', { placeholder: '{{trigger.data.blockId}}' })}

      {operation === 'updateBlock' && (
        <>
          <ConfigSelect
            label="Block Type"
            value={config.blockType || 'paragraph'}
            onChange={(val) => updateConfig('blockType', val)}
            options={BLOCK_TYPES}
            accentColor={ACCENT}
          />
          {text('New Text', 'content', { placeholder: 'Updated block text...', multiline: true })}
        </>
      )}

      {operation === 'getUser' && text('User ID', 'userId', { placeholder: 'User UUID' })}

      {operation === 'createComment' && (
        <>
          {text('Page ID', 'pageId', { optional: true, placeholder: '{{trigger.data.pageId}}' })}
          {text('Discussion ID', 'discussionId', { optional: true, placeholder: 'Discussion ID' })}
          {text('Comment', 'content', { placeholder: 'Looks good!', multiline: true })}
        </>
      )}

      {operation === 'getComments' && (
        <Field label="Page / Block ID">
          <SmartVariableInput nodeId={nodeId} value={config.blockId || config.pageId || ''} onChange={(val) => updateConfig('blockId', val)} placeholder="{{trigger.data.pageId}}" />
        </Field>
      )}

      {operation === 'appendBlock' && (
        <>
          {text('Page ID', 'pageId', { placeholder: '{{trigger.data.pageId}}' })}
          {text('Content', 'content', { placeholder: '{{ai.result}}', multiline: true })}
        </>
      )}

      {operation === 'searchPages' && (
        <>
          {text('Query', 'query', { placeholder: 'Meeting notes' })}
          <ConfigPills
            label="Filter By"
            value={config.filter || ''}
            onChange={(val) => updateConfig('filter', val)}
            options={[{ value: '', label: 'All' }, { value: 'page', label: 'Pages' }, { value: 'database', label: 'Databases' }]}
            accentColor={ACCENT}
          />
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Notion Integration Token"
        placeholder="Select Notion credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">id, url, properties, results[ ]</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
