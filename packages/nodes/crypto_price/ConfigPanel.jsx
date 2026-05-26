import SmartVariableInput from "@/components/ui/SmartVariableInput";

const TOP_COINS = ["BTC","ETH","SOL","BNB","XRP","ADA","DOGE","AVAX","MATIC","DOT","LINK","UNI","ATOM","LTC","BCH"];
const CURRENCIES = ["USD","EUR","GBP","INR","JPY","BTC","ETH"];

export default function CryptoPriceNode({ config = {}, updateConfig, nodeId }) {
  const selectedCoins = config.coins || ["BTC"];
  const currency = config.currency || "USD";

  const toggleCoin = (coin) => {
    const next = selectedCoins.includes(coin)
      ? selectedCoins.filter(c => c !== coin)
      : [...selectedCoins, coin];
    updateConfig("coins", next.length ? next : ["BTC"]);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#f59e0b">
            <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z"/>
            <path fill="#fff" d="M17.204 10.532c.24-1.604-.979-2.47-2.643-3.045l.54-2.165-1.316-.328-.526 2.11c-.346-.086-.7-.168-1.055-.248l.53-2.125-1.316-.329-.54 2.165a32.3 32.3 0 01-.842-.2l.002-.007-1.815-.454-.35 1.405s.98.224.96.238c.534.133.63.486.614.765l-1.476 5.921c-.112.278-.397.697-1.038.537.023.033-.961-.24-.961-.24l-.657 1.507 1.715.428c.319.08.632.163.94.242l-.546 2.19 1.316.329.54-2.167c.36.098.708.188 1.048.273l-.538 2.16 1.316.328.546-2.186c2.252.426 3.948.254 4.661-1.783.575-1.638-.029-2.583-1.212-3.2.862-.199 1.512-.767 1.686-1.94zm-3.016 4.228c-.409 1.638-3.178.752-4.075.53l.727-2.916c.897.224 3.77.668 3.348 2.386zm.409-4.25c-.373 1.493-2.675.735-3.422.549l.66-2.645c.746.186 3.148.533 2.762 2.096z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Crypto Price Alert</div>
          <div className="text-[11px] text-zinc-500">Live prices, thresholds, portfolio value</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Coins to Watch</label>
        <div className="flex gap-1 flex-wrap">
          {TOP_COINS.map((c) => (
            <button key={c} onClick={() => toggleCoin(c)}
              className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all font-mono ${selectedCoins.includes(c) ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <SmartVariableInput value={config.customCoins || ""} onChange={(v) => updateConfig("customCoins", v)} placeholder="Or enter custom IDs: solana,polkadot (CoinGecko IDs)" />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Quote Currency</label>
        <div className="flex gap-1.5 flex-wrap">
          {CURRENCIES.map((c) => (
            <button key={c} onClick={() => updateConfig("currency", c)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${currency === c ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Price threshold alert</p>
          <p className="text-[10px] text-zinc-600">Fail/continue based on price condition</p>
        </div>
        <button onClick={() => updateConfig("useThreshold", !config.useThreshold)}
          className={`w-10 h-5 rounded-full border transition-all relative ${config.useThreshold ? "bg-yellow-500 border-yellow-400" : "bg-zinc-700 border-zinc-600"}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.useThreshold ? "left-5" : "left-0.5"}`} />
        </button>
      </div>

      {config.useThreshold && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Coin (for threshold)</label>
            <SmartVariableInput value={config.thresholdCoin || "BTC"} onChange={(v) => updateConfig("thresholdCoin", v)} placeholder="BTC" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Condition</label>
            <div className="flex gap-1.5">
              {["above","below"].map((c) => (
                <button key={c} onClick={() => updateConfig("condition", c)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(config.condition||"above") === c ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  Price {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Threshold Price ({currency})</label>
            <SmartVariableInput value={config.thresholdPrice || ""} onChange={(v) => updateConfig("thresholdPrice", v)} placeholder="50000" />
          </div>
        </>
      )}

      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
        <div>
          <p className="text-[12px] font-semibold text-zinc-300">Include 24h change %</p>
        </div>
        <button onClick={() => updateConfig("include24h", !config.include24h)}
          className={`w-10 h-5 rounded-full border transition-all relative ${config.include24h !== false ? "bg-yellow-500 border-yellow-400" : "bg-zinc-700 border-zinc-600"}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.include24h !== false ? "left-5" : "left-0.5"}`} />
        </button>
      </div>

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Uses CoinGecko free API. Returns: <span className="text-zinc-300">coin, price, change24h, marketCap, volume24h, alertTriggered</span>
      </div>
    </div>
  );
}
