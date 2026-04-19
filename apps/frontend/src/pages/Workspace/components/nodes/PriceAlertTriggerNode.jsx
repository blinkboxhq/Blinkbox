const TOP_COINS = [
  { id: "bitcoin", label: "Bitcoin (BTC)" },
  { id: "ethereum", label: "Ethereum (ETH)" },
  { id: "solana", label: "Solana (SOL)" },
  { id: "ripple", label: "XRP (XRP)" },
  { id: "cardano", label: "Cardano (ADA)" },
  { id: "dogecoin", label: "Dogecoin (DOGE)" },
  { id: "polkadot", label: "Polkadot (DOT)" },
  { id: "chainlink", label: "Chainlink (LINK)" },
  { id: "avalanche-2", label: "Avalanche (AVAX)" },
  { id: "matic-network", label: "Polygon (MATIC)" },
];

export default function PriceAlertTriggerNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-yellow-400">Price Alert Trigger</span>
          <span className="text-[10px] text-zinc-500">Fires when a crypto price crosses a threshold (via CoinGecko, free)</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Coin</label>
        <select
          value={config.coinId || "bitcoin"}
          onChange={(e) => updateConfig("coinId", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500/40"
        >
          {TOP_COINS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Currency</label>
          <select
            value={config.currency || "usd"}
            onChange={(e) => updateConfig("currency", e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500/40"
          >
            {["usd", "eur", "gbp", "jpy", "cad", "aud"].map((c) => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Condition</label>
          <div className="grid grid-cols-2 gap-1">
            {["above", "below"].map((cond) => (
              <button
                key={cond}
                onClick={() => updateConfig("condition", cond)}
                className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${
                  (config.condition || "above") === cond
                    ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400"
                    : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
                }`}
              >
                {cond === "above" ? "↑ Above" : "↓ Below"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Threshold Price</label>
        <input
          type="number" min="0" step="any"
          value={config.threshold || ""}
          onChange={(e) => updateConfig("threshold", e.target.value)}
          placeholder="50000"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-500/40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Poll Interval (min)</label>
        <input
          type="number" min="1" max="60"
          value={config.pollIntervalMinutes ?? 5}
          onChange={(e) => updateConfig("pollIntervalMinutes", parseInt(e.target.value))}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-500/40"
        />
      </div>
    </div>
  );
}
