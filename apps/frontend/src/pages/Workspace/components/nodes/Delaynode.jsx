import { Clock, Hourglass } from 'lucide-react';

export default function DelayNode({ config, updateConfig }) {
  // Read from config, default to 10 seconds
  const amount = config.amount ?? 10;
  const unit = config.unit || 'seconds';

  // 🧠 The Invisible Math Engine
  const handleUpdate = (newAmount, newUnit) => {
    let multiplier = 1000;
    if (newUnit === 'minutes') multiplier = 60 * 1000;
    if (newUnit === 'hours') multiplier = 60 * 60 * 1000;

    const ms = (parseFloat(newAmount) || 0) * multiplier;

    // We save the user-friendly values for the UI, and the raw 'ms' for the backend
    updateConfig('amount', newAmount);
    updateConfig('unit', newUnit);
    updateConfig('ms', ms);
  };

  const handlePreset = (presetAmount, presetUnit) => {
    handleUpdate(presetAmount, presetUnit);
  };

  // Generate the human-readable summary text
  const summaryText = amount > 0 
    ? `Engine will pause for exactly ${amount} ${unit} before continuing.`
    : `Engine will not pause.`;

  return (
    <div className="flex flex-col gap-6 w-full">
      
      {/* 1. PREMIUM HEADER */}
      <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
        <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400 shrink-0">
          <Hourglass className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-orange-400">Execution Delay</span>
          <span className="text-[10px] text-slate-400 leading-relaxed">
            {summaryText}
          </span>
        </div>
      </div>

      {/* 2. CHUNKY INPUT CONTROLS */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wait Duration</label>
        <div className="flex bg-[#0a0a0a] border border-[#222] rounded-xl overflow-hidden focus-within:border-orange-500/50 focus-within:shadow-[0_0_15px_rgba(249,115,22,0.15)] transition-all">
          
          <input 
            type="number"
            min="0"
            value={amount}
            onChange={(e) => handleUpdate(e.target.value, unit)}
            placeholder="0"
            className="w-1/2 bg-transparent px-4 py-3 text-xl font-bold text-white outline-none text-center"
          />
          
          <div className="w-px bg-[#222]"></div>
          
          <select
            value={unit}
            onChange={(e) => handleUpdate(amount, e.target.value)}
            className="w-1/2 bg-transparent px-4 py-3 text-sm font-bold text-orange-300 outline-none cursor-pointer appearance-none text-center"
          >
            <option value="seconds">Seconds</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
          </select>
        </div>
      </div>

      {/* 3. QUICK PRESETS */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quick Presets</label>
        <div className="grid grid-cols-4 gap-2">
          <button 
            onClick={() => handlePreset(15, 'seconds')}
            className="py-2 bg-[#050505] border border-[#222] hover:border-orange-500/30 hover:bg-orange-500/5 rounded-lg text-xs font-bold text-slate-400 hover:text-orange-400 transition-colors"
          >
            15 Sec
          </button>
          <button 
            onClick={() => handlePreset(1, 'minutes')}
            className="py-2 bg-[#050505] border border-[#222] hover:border-orange-500/30 hover:bg-orange-500/5 rounded-lg text-xs font-bold text-slate-400 hover:text-orange-400 transition-colors"
          >
            1 Min
          </button>
          <button 
            onClick={() => handlePreset(15, 'minutes')}
            className="py-2 bg-[#050505] border border-[#222] hover:border-orange-500/30 hover:bg-orange-500/5 rounded-lg text-xs font-bold text-slate-400 hover:text-orange-400 transition-colors"
          >
            15 Min
          </button>
          <button 
            onClick={() => handlePreset(1, 'hours')}
            className="py-2 bg-[#050505] border border-[#222] hover:border-orange-500/30 hover:bg-orange-500/5 rounded-lg text-xs font-bold text-slate-400 hover:text-orange-400 transition-colors"
          >
            1 Hour
          </button>
        </div>
      </div>

    </div>
  );
}