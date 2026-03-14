import { GitBranch, PlusCircle, Trash2 } from 'lucide-react';

export default function LogicRouterNode({ config = {}, updateConfig }) {
  const routes = config.routes || [];

  const addRoute = () => updateConfig('routes', [...routes, { path: `path_${routes.length + 1}`, left: '', operator: 'equals', right: '' }]);
  
  const updateRoute = (index, field, value) => {
    const updated = routes.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    updateConfig('routes', updated);
  };
  
  const removeRoute = (index) => updateConfig('routes', routes.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl relative overflow-hidden shadow-[0_0_20px_rgba(244,114,182,0.05)]">
        <div className="p-2 bg-pink-500/20 border border-pink-500/30 rounded-lg text-pink-400 shrink-0 z-10">
          <GitBranch className="w-5 h-5" />
        </div>
        <div className="flex flex-col z-10">
          <span className="text-sm font-bold text-pink-400 tracking-wide">Logic Router</span>
          <span className="text-[10px] text-zinc-400 truncate mt-0.5">Route data based on conditions</span>
        </div>
      </div>

      {/* Routes List */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Routing Paths</label>
          <button onClick={addRoute} className="flex items-center gap-1 text-[10px] font-bold text-pink-400 hover:text-pink-300 transition-colors uppercase">
            <PlusCircle className="w-3 h-3" /> Add Path
          </button>
        </div>

        {routes.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-[#222] rounded-xl text-xs text-zinc-600 bg-[#0a0a0a]">
            No routes defined. Everything goes to "default".
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {routes.map((route, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 bg-[#0a0a0a] border border-[#222] rounded-xl relative group">
                <button onClick={() => removeRoute(i)} className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                
                <div className="flex flex-col gap-1.5 pr-6">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">Path Name (Edge Condition)</label>
                  <input 
                    value={route.path} 
                    onChange={(e) => updateRoute(i, 'path', e.target.value)}
                    placeholder="high_value_customer"
                    className="w-full bg-[#111] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-pink-500/50 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mt-1">
                  <input 
                    value={route.left} 
                    onChange={(e) => updateRoute(i, 'left', e.target.value)}
                    placeholder="{{ $json.price }}"
                    className="w-full bg-[#111] border border-[#333] rounded-md px-2 py-1.5 text-xs text-pink-300 font-mono focus:outline-none focus:border-pink-500/50 transition-colors"
                  />
                  <select 
                    value={route.operator} 
                    onChange={(e) => updateRoute(i, 'operator', e.target.value)}
                    className="bg-[#111] border border-[#333] rounded-md px-1 py-1.5 text-[10px] text-white font-bold focus:outline-none outline-none cursor-pointer"
                  >
                    <option value="equals">==</option>
                    <option value="notEquals">!=</option>
                    <option value="gt">&gt;</option>
                    <option value="lt">&lt;</option>
                    <option value="contains">has</option>
                    <option value="exists">exists</option>
                  </select>
                  <input 
                    value={route.right} 
                    onChange={(e) => updateRoute(i, 'right', e.target.value)}
                    placeholder="1000"
                    className="w-full bg-[#111] border border-[#333] rounded-md px-2 py-1.5 text-xs text-pink-300 font-mono focus:outline-none focus:border-pink-500/50 transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-pink-500/5 border border-pink-500/10 rounded-lg text-[10px] text-zinc-500 leading-relaxed">
        💡 To route a connection along a specific path, click the Edge on the canvas and set its condition to match the <strong>Path Name</strong> defined here.
      </div>
    </div>
  );
}