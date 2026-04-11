import { PlusCircle, Edit3, Database, FileText, AlignLeft, Search } from 'lucide-react';
import SmartVariableInput from '../../../../components/ui/SmartVariableInput';
import CredentialPicker from '../../../../components/ui/CredentialPicker';

function NotionIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}

const OPERATIONS = [
  { value: 'createPage',    label: 'Create Page',     icon: PlusCircle },
  { value: 'updatePage',    label: 'Update Page',     icon: Edit3 },
  { value: 'queryDatabase', label: 'Query Database',  icon: Database },
  { value: 'getPage',       label: 'Get Page',        icon: FileText },
  { value: 'appendBlock',   label: 'Append Content',  icon: AlignLeft },
  { value: 'searchPages',   label: 'Search',          icon: Search },
];

export default function NotionNode({ config = {}, updateConfig }) {
  const operation = config.operation || 'createPage';

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
        <div className="p-2 bg-white/10 rounded-lg text-white shrink-0">
          <NotionIcon className="w-5 h-5" />
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
            <SmartVariableInput value={config.parentId || ''} onChange={(val) => updateConfig('parentId', val)} placeholder="Database or page ID / URL" />
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
            <SmartVariableInput value={config.title || ''} onChange={(val) => updateConfig('title', val)} placeholder="My New Page" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Properties (JSON) <span className="text-zinc-700">(optional)</span></label>
            <SmartVariableInput
              value={typeof config.properties === 'string' ? config.properties : (config.properties ? JSON.stringify(config.properties, null, 2) : '')}
              onChange={(val) => { try { updateConfig('properties', JSON.parse(val)); } catch { updateConfig('properties', val); }}}
              placeholder='{"Status": {"select": {"name": "Active"}}}'
              multiline
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Content <span className="text-zinc-700">(optional plain text)</span></label>
            <SmartVariableInput value={config.content || ''} onChange={(val) => updateConfig('content', val)} placeholder="Page body text..." multiline />
          </div>
        </>
      )}

      {/* updatePage */}
      {operation === 'updatePage' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Page ID</label>
            <SmartVariableInput value={config.pageId || ''} onChange={(val) => updateConfig('pageId', val)} placeholder="{{trigger.data.pageId}}" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Properties (JSON)</label>
            <SmartVariableInput
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
            <SmartVariableInput value={config.databaseId || ''} onChange={(val) => updateConfig('databaseId', val)} placeholder="Database ID or URL" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filter (JSON) <span className="text-zinc-700">(optional)</span></label>
            <SmartVariableInput
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
          <SmartVariableInput value={config.pageId || ''} onChange={(val) => updateConfig('pageId', val)} placeholder="{{trigger.data.pageId}}" />
        </div>
      )}

      {/* appendBlock */}
      {operation === 'appendBlock' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Page ID</label>
            <SmartVariableInput value={config.pageId || ''} onChange={(val) => updateConfig('pageId', val)} placeholder="{{trigger.data.pageId}}" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Content <span className="text-zinc-700">(plain text — double newline = new paragraph)</span></label>
            <SmartVariableInput value={config.content || ''} onChange={(val) => updateConfig('content', val)} placeholder="{{ai.result}}" multiline />
          </div>
        </>
      )}

      {/* searchPages */}
      {operation === 'searchPages' && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Query</label>
            <SmartVariableInput value={config.query || ''} onChange={(val) => updateConfig('query', val)} placeholder="Meeting notes" />
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
