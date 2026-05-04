import { PlusCircle, Edit3, Database, FileText, AlignLeft, Search } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';
import imgNotion from '../../../../assets/notion.svg';


const OPERATIONS = [
  { value: 'createPage',    label: 'Create Page',     icon: PlusCircle },
  { value: 'updatePage',    label: 'Update Page',     icon: Edit3 },
  { value: 'queryDatabase', label: 'Query Database',  icon: Database },
  { value: 'getPage',       label: 'Get Page',        icon: FileText },
  { value: 'appendBlock',   label: 'Append Content',  icon: AlignLeft },
  { value: 'searchPages',   label: 'Search',          icon: Search },
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
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-2">
          {OPERATIONS.map((op) => {
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

      {/* getPage */}
      {operation === 'getPage' && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Page ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.pageId || ''} onChange={(val) => updateConfig('pageId', val)} placeholder="{{trigger.data.pageId}}" />
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
