import { Plus, Search, LayoutGrid, List, Box } from 'lucide-react';

const TABS = [
  { key: 'all',    label: 'All'    },
  { key: 'active', label: 'Active' },
  { key: 'draft',  label: 'Draft'  },
];

export default function DashboardHeader({
  onInitialize, search, setSearch, statusFilter, setStatusFilter,
  viewMode, setViewMode, total, compact = false,
}) {
  const filterRow = (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Status tabs */}
      <div className="flex items-center bg-[#111118] border border-[#26263a] rounded-md p-0.5">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1 text-[11px] font-medium rounded transition-all duration-150 ${
              statusFilter === tab.key ? 'bg-white/[0.08] text-white' : 'text-neutral-600 hover:text-neutral-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-700" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="pl-7 pr-3 py-[5px] bg-[#111118] border border-[#26263a] rounded-md text-[11px] text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-700 transition-colors w-[140px]"
        />
      </div>

      {/* View toggle */}
      <div className="flex items-center bg-[#111118] border border-[#26263a] rounded-md p-0.5">
        <button onClick={() => setViewMode('grid')} title="Grid view"
          className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white/[0.08] text-white' : 'text-neutral-600 hover:text-neutral-400'}`}>
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setViewMode('list')} title="List view"
          className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white/[0.08] text-white' : 'text-neutral-600 hover:text-neutral-400'}`}>
          <List className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* New workflow */}
      <button
        onClick={onInitialize}
        className="flex items-center gap-1.5 px-3 py-[5px] bg-white text-black text-[11px] font-semibold rounded-lg hover:bg-neutral-200 transition-all active:scale-[0.97]"
      >
        <Box className="w-3 h-3" /> New
      </button>
    </div>
  );

  if (compact) return filterRow;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[15px] font-semibold text-white">Workflows</h2>
          {total > 0 && <span className="text-[11px] text-neutral-700 font-mono">{total}</span>}
        </div>
        {filterRow}
      </div>
    </div>
  );
}
