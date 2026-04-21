import { Plus, Search, LayoutGrid, List, Zap } from 'lucide-react';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
];

export default function DashboardHeader({ onInitialize, search, setSearch, statusFilter, setStatusFilter, viewMode, setViewMode, total }) {
  return (
    <div className="mb-6">
      {/* Top row: title + create */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold text-white">Workflows</h2>
          {total > 0 && <span className="text-xs text-neutral-700 font-mono">{total}</span>}
        </div>
        <button
          onClick={onInitialize}
          className="flex items-center gap-1.5 px-4 py-[7px] bg-white text-black text-[13px] font-semibold rounded-lg hover:bg-neutral-200 transition-all active:scale-[0.97]"
        >
          <Zap className="w-3.5 h-3.5" /> New Automation
        </button>
      </div>

      {/* Filter row: tabs + search + view toggle */}
      <div className="flex items-center gap-3">
        {/* Status tabs */}
        <div className="flex items-center bg-neutral-950 border border-neutral-900/80 rounded-md p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1 text-[12px] font-medium rounded transition-all duration-150 ${
                statusFilter === tab.key
                  ? 'bg-white/[0.08] text-white'
                  : 'text-neutral-600 hover:text-neutral-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-700" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-8 pr-3 py-[6px] bg-neutral-950 border border-neutral-900/80 rounded-md text-[12px] text-white placeholder:text-neutral-700 focus:outline-none focus:border-neutral-700 transition-colors"
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex items-center bg-neutral-950 border border-neutral-900/80 rounded-md p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white/[0.08] text-white' : 'text-neutral-600 hover:text-neutral-400'}`}
            title="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white/[0.08] text-white' : 'text-neutral-600 hover:text-neutral-400'}`}
            title="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
