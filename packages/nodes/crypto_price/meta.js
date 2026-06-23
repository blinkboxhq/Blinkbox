export default {
  backendType: "crypto_price",
  label: "Crypto Price",
  description: "Live prices, thresholds, and portfolio value via CoinGecko",
  fields: [
    { name: "coins", label: "Coins to Watch", type: "multiOptions", default: ["BTC"], options: [
      "BTC","ETH","SOL","BNB","XRP","ADA","DOGE","AVAX","MATIC","DOT","LINK","UNI","ATOM","LTC","BCH"
    ]},
    { name: "customCoins", label: "Custom Coin IDs (optional)", type: "string", smart: true, placeholder: "solana,polkadot  (CoinGecko IDs)" },
    { name: "currency", label: "Quote Currency", type: "options", cols: 7, default: "USD", options: ["USD","EUR","GBP","INR","JPY","BTC","ETH"] },
    { name: "useThreshold", label: "Price threshold alert", type: "boolean", default: false, hint: "Fail/continue based on price condition" },
    { name: "thresholdCoin", label: "Coin (for threshold)", type: "string", smart: true, placeholder: "BTC", show: { useThreshold: true } },
    { name: "condition", label: "Condition", type: "options", cols: 2, default: "above", options: [
      { value: "above", label: "Price above" },
      { value: "below", label: "Price below" },
    ], show: { useThreshold: true } },
    { name: "thresholdPrice", label: "Threshold Price", type: "string", smart: true, placeholder: "50000", show: { useThreshold: true } },
    { name: "include24h", label: "Include 24h change %", type: "boolean", default: true },
    { type: "notice", variant: "info", text: "Uses CoinGecko free API — no credential required." },
  ],
  outputs: ["coin", "price", "change24h", "marketCap", "volume24h", "alertTriggered"],
};
