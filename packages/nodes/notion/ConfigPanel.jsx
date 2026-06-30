import { PlusCircle, Edit3, Database, FileText, AlignLeft, Search, Trash2, RotateCcw, Box, MessageSquare, Users, User } from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import imgNotion from '@/assets/notion.svg';

const lbl = 'text-[10px] font-bold text-zinc-500 uppercase tracking-widest';
const jsonVal = (v) => (typeof v === 'string' ? v : (v ? JSON.stringify(v, null, 2) : ''));

const GROUPS = [
  { title: 'Pages', ops: [
    { value: 'createPage',  label: 'Create Page',  icon: PlusCircle },
    { value: 'updatePage',  label: 'Update Page',  icon: Edit3 },
    { value: 'getPage',     label: 'Get Page',     icon: FileText },
    { value: 'deletePage',  label: 'Archive Page', icon: Trash2 },
    { value: 'restorePage', label: 'Restore Page', icon: RotateCcw },
  ]},
  { title: 'Databases', ops: [
    { value: 'queryDatabase',  label: 'Query DB',   icon: Database },
    { value: 'createDatabase', label: 'Create DB',  icon: PlusCircle },
    { value: 'getDatabase',    label: 'Get DB',     icon: Database },
    { value: 'updateDatabase', label: 'Update DB',  icon: Edit3 },
  ]},
  { title: 'Blocks', ops: [
    { value: 'appendBlock',      label: 'Append Content', icon: AlignLeft },
    { value: 'getBlockChildren', label: 'List Blocks',    icon: Box },
    { value: 'getBlock',         label: 'Get Block',      icon: Box },
    { value: 'updateBlock',      label: 'Update Block',   icon: Edit3 },
    { value: 'deleteBlock',      label: 'Delete Block',   icon: Trash2 },
  ]},
  { title: 'Search · Users · Comments', ops: [
    { value: 'searchPages',   label: 'Search',         icon: Search },
    { value: 'listUsers',     label: 'List Users',     icon: Users },
    { value: 'getUser',       label: 'Get User',       icon: User },
    { value: 'createComment', label: 'Add Comment',    icon: MessageSquare },
    { value: 'getComments',   label: 'Get Comments',   icon: MessageSquare },
  ]},
];

export default function NotionNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || 'createPage';

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
          <img src={imgNotion} alt="Notion" className="w-5 h-5" style={{ filter: 'invert(1)' }} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">Notion</span>
          <span className="text-[10px] text-zinc-500">Read & write Notion pages and databases</span>
        </div>
      </div>

      {/* Operations */}
      <div className="flex flex-col gap-3">
        <label className={lbl}>Operation</label>
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group.title}</span>
            <div className="grid grid-cols-2 gap-2">
              {group.ops.map((op) => {
                const Icon = op.icon;
                return (
                  <button key={op.value} onClick={() => updateConfig('operation', op.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                      operation === op.value
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]'
                    }`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" /> {op.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* createPage */}
      {operation === 'createPage' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Parent</label>
            <SmartVariableInput nodeId={nodeId} value={config.parentId || ''} onChange={(val) => updateConfig('parentId', val)} placeholder="Database or page ID / URL" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => updateConfig('parentType', config.parentType === 'page' ? 'database' : 'page')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                config.parentType === 'page' ? 'bg-white/10 border-white/30 text-white' : 'border-[#222] text-zinc-500'
              }`}>
              {config.parentType === 'page' ? 'Inside Page' : 'In Database'}
            </button>
            <span className="text-[10px] text-zinc-600">Toggle parent type</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title <span className="text-zinc-700">(optional — use properties for databases)</span></label>
            <SmartVariableInput nodeId={nodeId} value={config.title || ''} onChange={(val) => updateConfig('title', val)} placeholder="My New Page" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Properties (JSON) <span className="text-zinc-700">(optional)</span></label>
            <SmartVariableInput
              nodeId={nodeId}
              value={typeof config.properties === 'string' ? config.properties : (config.properties ? JSON.stringify(config.properties, null, 2) : '')}
              onChange={(val) => { try { updateConfig('properties', JSON.parse(val)); } catch { updateConfig('properties', val); }}}
              placeholder='{"Status": {"select": {"name": "Active"}}}'
              multiline
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Content <span className="text-zinc-700">(optional plain text)</span></label>
            <SmartVariableInput nodeId={nodeId} value={config.content || ''} onChange={(val) => updateConfig('content', val)} placeholder="Page body text..." multiline />
          </div>
        </>
      )}

      {/* updatePage */}
      {operation === 'updatePage' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Page ID</label>
            <SmartVariableInput nodeId={nodeId} value={config.pageId || ''} onChange={(val) => updateConfig('pageId', val)} placeholder="{{trigger.data.pageId}}" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Properties (JSON)</label>
            <SmartVariableInput
              nodeId={nodeId}
              value={typeof config.properties === 'string' ? config.properties : (config.properties ? JSON.stringify(config.properties, null, 2) : '')}
              onChange={(val) => { try { updateConfig('properties', JSON.parse(val)); } catch { updateConfig('properties', val); }}}
              placeholder='{"Status": {"select": {"name": "Done"}}}'
              multiline
            />
          </div>
        </>
      )}

      {/* queryDatabase */}
      {operation === 'queryDatabase' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Database ID</label>
            <SmartVariableInput nodeId={nodeId} value={config.databaseId || ''} onChange={(val) => updateConfig('databaseId', val)} placeholder="Database ID or URL" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filter (JSON) <span className="text-zinc-700">(optional)</span></label>
            <SmartVariableInput
              nodeId={nodeId}
              value={typeof config.filter === 'string' ? config.filter : (config.filter ? JSON.stringify(config.filter, null, 2) : '')}
              onChange={(val) => { try { updateConfig('filter', JSON.parse(val)); } catch { updateConfig('filter', val); }}}
              placeholder='{"property": "Status", "select": {"equals": "Active"}}'
              multiline
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Page Size</label>
            <input type="number" min={1} max={100} value={config.pageSize || 10}
              onChange={(e) => updateConfig('pageSize', Number(e.target.value))}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 transition-colors" />
          </div>
        </>
      )}

      {/* page-ID-only ops */}
      {['getPage', 'deletePage', 'restorePage'].includes(operation) && (
        <div className="flex flex-col gap-2">
          <label className={lbl}>Page ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.pageId || ''} onChange={(val) => updateConfig('pageId', val)} placeholder="{{trigger.data.pageId}}" />
        </div>
      )}

      {/* createDatabase */}
      {operation === 'createDatabase' && (
        <>
          <div className="flex flex-col gap-2">
            <label className={lbl}>Parent Page ID</label>
            <SmartVariableInput nodeId={nodeId} value={config.parentId || ''} onChange={(val) => updateConfig('parentId', val)} placeholder="Parent page ID / URL" />
          </div>
          <div className="flex flex-col gap-2">
            <label className={lbl}>Title</label>
            <SmartVariableInput nodeId={nodeId} value={config.title || ''} onChange={(val) => updateConfig('title', val)} placeholder="Tasks" />
          </div>
          <div className="flex flex-col gap-2">
            <label className={lbl}>Properties (JSON) <span className="text-zinc-700">(schema — defaults to a Name title)</span></label>
            <SmartVariableInput nodeId={nodeId} value={jsonVal(config.properties)}
              onChange={(val) => { try { updateConfig('properties', JSON.parse(val)); } catch { updateConfig('properties', val); } }}
              placeholder='{"Name":{"title":{}},"Status":{"select":{"options":[{"name":"Open"}]}}}' multiline />
          </div>
        </>
      )}

      {/* getDatabase / updateDatabase */}
      {['getDatabase', 'updateDatabase'].includes(operation) && (
        <>
          <div className="flex flex-col gap-2">
            <label className={lbl}>Database ID</label>
            <SmartVariableInput nodeId={nodeId} value={config.databaseId || ''} onChange={(val) => updateConfig('databaseId', val)} placeholder="Database ID or URL" />
          </div>
          {operation === 'updateDatabase' && (
            <>
              <div className="flex flex-col gap-2">
                <label className={lbl}>New Title <span className="text-zinc-700">(optional)</span></label>
                <SmartVariableInput nodeId={nodeId} value={config.title || ''} onChange={(val) => updateConfig('title', val)} placeholder="Renamed DB" />
              </div>
              <div className="flex flex-col gap-2">
                <label className={lbl}>Properties (JSON) <span className="text-zinc-700">(optional)</span></label>
                <SmartVariableInput nodeId={nodeId} value={jsonVal(config.properties)}
                  onChange={(val) => { try { updateConfig('properties', JSON.parse(val)); } catch { updateConfig('properties', val); } }}
                  placeholder='{"Priority":{"select":{"options":[{"name":"High"}]}}}' multiline />
              </div>
            </>
          )}
        </>
      )}

      {/* block-ID ops */}
      {['getBlockChildren', 'getBlock', 'updateBlock', 'deleteBlock'].includes(operation) && (
        <div className="flex flex-col gap-2">
          <label className={lbl}>{operation === 'getBlockChildren' ? 'Page / Block ID' : 'Block ID'}</label>
          <SmartVariableInput nodeId={nodeId} value={config.blockId || ''} onChange={(val) => updateConfig('blockId', val)} placeholder="{{trigger.data.blockId}}" />
        </div>
      )}

      {/* updateBlock content */}
      {operation === 'updateBlock' && (
        <>
          <div className="flex flex-col gap-2">
            <label className={lbl}>Block Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {['paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'to_do'].map((t) => (
                <button key={t} onClick={() => updateConfig('blockType', t)}
                  className={`px-2 py-1.5 rounded-md border text-[10px] font-semibold transition-all ${
                    (config.blockType || 'paragraph') === t ? 'bg-white/10 border-white/30 text-white' : 'bg-[#0a0a0a] border-[#222] text-zinc-500'
                  }`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className={lbl}>New Text</label>
            <SmartVariableInput nodeId={nodeId} value={config.content || ''} onChange={(val) => updateConfig('content', val)} placeholder="Updated block text..." multiline />
          </div>
        </>
      )}

      {/* getUser */}
      {operation === 'getUser' && (
        <div className="flex flex-col gap-2">
          <label className={lbl}>User ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.userId || ''} onChange={(val) => updateConfig('userId', val)} placeholder="User UUID" />
        </div>
      )}

      {/* createComment */}
      {operation === 'createComment' && (
        <>
          <div className="flex flex-col gap-2">
            <label className={lbl}>Page ID <span className="text-zinc-700">(or leave blank + use Discussion ID)</span></label>
            <SmartVariableInput nodeId={nodeId} value={config.pageId || ''} onChange={(val) => updateConfig('pageId', val)} placeholder="{{trigger.data.pageId}}" />
          </div>
          <div className="flex flex-col gap-2">
            <label className={lbl}>Discussion ID <span className="text-zinc-700">(optional — reply in a thread)</span></label>
            <SmartVariableInput nodeId={nodeId} value={config.discussionId || ''} onChange={(val) => updateConfig('discussionId', val)} placeholder="Discussion ID" />
          </div>
          <div className="flex flex-col gap-2">
            <label className={lbl}>Comment</label>
            <SmartVariableInput nodeId={nodeId} value={config.content || ''} onChange={(val) => updateConfig('content', val)} placeholder="Looks good!" multiline />
          </div>
        </>
      )}

      {/* getComments */}
      {operation === 'getComments' && (
        <div className="flex flex-col gap-2">
          <label className={lbl}>Page / Block ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.blockId || config.pageId || ''} onChange={(val) => updateConfig('blockId', val)} placeholder="{{trigger.data.pageId}}" />
        </div>
      )}

      {/* appendBlock */}
      {operation === 'appendBlock' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Page ID</label>
            <SmartVariableInput nodeId={nodeId} value={config.pageId || ''} onChange={(val) => updateConfig('pageId', val)} placeholder="{{trigger.data.pageId}}" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Content <span className="text-zinc-700">(plain text — double newline = new paragraph)</span></label>
            <SmartVariableInput nodeId={nodeId} value={config.content || ''} onChange={(val) => updateConfig('content', val)} placeholder="{{ai.result}}" multiline />
          </div>
        </>
      )}

      {/* searchPages */}
      {operation === 'searchPages' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Query</label>
            <SmartVariableInput nodeId={nodeId} value={config.query || ''} onChange={(val) => updateConfig('query', val)} placeholder="Meeting notes" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filter By</label>
            <div className="grid grid-cols-3 gap-2">
              {[['', 'All'], ['page', 'Pages'], ['database', 'Databases']].map(([val, label]) => (
                <button key={val} onClick={() => updateConfig('filter', val)}
                  className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                    (config.filter || '') === val ? 'bg-white/10 border-white/30 text-white' : 'bg-[#0a0a0a] border-[#222] text-zinc-500'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Credential */}
      <CredentialPicker value={config.credentialId || ''} onChange={(id) => updateConfig('credentialId', id)}
        accentColor="zinc" label="Notion Integration Token" placeholder="Select Notion credential..." />
    </div>
  );
}
