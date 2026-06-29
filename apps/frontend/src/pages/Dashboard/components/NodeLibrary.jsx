import { useState, useMemo } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { NodeRegistry, CATEGORIES } from '../../Workspace/nodeRegistry';

const ACTION_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'trigger');

const ALL_NODES = Object.entries(NodeRegistry)
  .filter(([, def]) => def.category && def.category !== 'trigger' && !def.agentOnly)
  .map(([key, def]) => ({ key, ...def }));

const CATEGORY_COLORS = {
  trigger:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  ai_models: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  ai_agent:  'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
  apps:      'text-pink-400 bg-pink-500/10 border-pink-500/20',
  logic:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  data:      'text-blue-400 bg-blue-500/10 border-blue-500/20',
  infra:     'text-sky-400 bg-sky-500/10 border-sky-500/20',
};

function NodeCard({ node }) {
  const Icon = node.icon;
  const catColor = CATEGORY_COLORS[node.category] ?? 'text-zinc-400 bg-zinc-800/50 border-zinc-700/30';
  const cat = ACTION_CATEGORIES.find((c) => c.id === node.category);

  return (
    <div className="group flex items-center gap-3.5 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/50 hover:border-zinc-700/60 hover:bg-zinc-900/90 transition-all duration-150 cursor-default">
      {/* Icon */}
      <div className="w-10 h-10 shrink-0 flex items-center justify-center">
        {node.logoUrl ? (
          <img src={node.logoUrl} alt={node.label} className="w-8 h-8 object-contain"
            style={node.imgFilter ? { filter: node.imgFilter } : undefined} />
        ) : (
          <Icon className={`w-7 h-7 ${node.colorClass}`} strokeWidth={1.4} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-zinc-100 truncate">{node.label}</span>
        </div>
        {node.description && (
          <p className="text-[11px] text-zinc-500 truncate">{node.description}</p>
        )}
      </div>

      {/* Category badge */}
      {cat && (
        <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${catColor}`}>
          {cat.label.split(' ')[0]}
        </span>
      )}
    </div>
  );
}

export default function NodeLibrary() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = useMemo(() => {
    let nodes = ALL_NODES;
    if (activeCategory !== 'all') nodes = nodes.filter((n) => n.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      nodes = nodes.filter((n) =>
        n.label.toLowerCase().includes(q) ||
        n.key.toLowerCase().includes(q) ||
        (n.description || '').toLowerCase().includes(q) ||
        (n.category || '').toLowerCase().includes(q)
      );
    }
    return nodes;
  }, [search, activeCategory]);

  const countByCategory = useMemo(() => {
    const map = {};
    ALL_NODES.forEach((n) => {
      map[n.category] = (map[n.category] || 0) + 1;
    });
    return map;
  }, []);

  return (
    <div className="flex h-full min-h-0" style={{ animation: 'dbFadeIn 0.15s ease-out' }}>

      {/* Left: category filter */}
      <aside className="w-56 shrink-0 border-r border-zinc-800/60 flex flex-col py-4 overflow-y-auto">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-5 mb-3">Categories</p>

        {/* All */}
        <button
          onClick={() => setActiveCategory('all')}
          className={`flex items-center justify-between mx-3 px-3 py-2 rounded-lg text-left transition-all ${activeCategory === 'all' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
        >
          <span className="text-[13px] font-medium">All Nodes</span>
          <span className="text-[11px] font-bold text-zinc-600">{ALL_NODES.length}</span>
        </button>

        <div className="mx-5 my-3 border-t border-zinc-800/60" />

        {ACTION_CATEGORIES.map((cat) => {
          const count = countByCategory[cat.id] ?? 0;
          if (count === 0) return null;
          const CatIcon = cat.icon;
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2.5 mx-3 px-3 py-2 rounded-lg text-left transition-all ${active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
            >
              <CatIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
              <span className="text-[12px] font-medium flex-1 truncate">{cat.label}</span>
              <span className="text-[10px] font-bold text-zinc-600">{count}</span>
            </button>
          );
        })}
      </aside>

      {/* Right: node grid */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">

        {/* Header */}
        <div className="flex items-center gap-4 px-6 pt-6 pb-4 shrink-0">
          <div>
            <h2 className="text-[18px] font-bold text-zinc-100">Node Library</h2>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              {filtered.length} {activeCategory === 'all' ? 'total' : ''} nodes{search ? ` matching "${search}"` : ''}
            </p>
          </div>

          {/* Search */}
          <div className="ml-auto flex items-center gap-2.5 px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-zinc-600 transition-colors w-72">
            <Search className="w-4 h-4 text-zinc-600 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search nodes..."
              className="flex-1 bg-transparent text-[13px] text-zinc-200 outline-none placeholder:text-zinc-700"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-zinc-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Search className="w-10 h-10 text-zinc-800 mb-3" />
              <p className="text-[14px] font-semibold text-zinc-600">No nodes found</p>
              <p className="text-[12px] text-zinc-700 mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {filtered.map((node) => (
                <NodeCard key={node.key} node={node} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
