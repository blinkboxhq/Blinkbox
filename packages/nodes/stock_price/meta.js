export default {
  backendType: "stock_price",
  label: "Stock Price",
  description: "Live and historical stock data via Alpha Vantage",
  fields: [
    { name: "symbol", label: "Ticker Symbol", type: "string", smart: true, placeholder: "AAPL  or  {{ $json.ticker }}" },
    {
      name: "mode", label: "Mode", type: "options", cols: 3, default: "quote",
      options: [
        { value: "quote", label: "Live Quote" },
        { value: "history", label: "History" },
        { value: "search", label: "Search" },
      ],
    },
    {
      type: "row",
      show: { mode: "history" },
      fields: [
        {
          name: "interval", label: "Interval", type: "options", cols: 2, default: "daily",
          options: ["1min", "5min", "15min", "60min", "daily", "weekly", "monthly"],
        },
        {
          name: "outputSize", label: "Output Size", type: "options", cols: 1, default: "compact",
          options: [{ value: "compact", label: "Compact (100)" }, { value: "full", label: "Full (20 yrs)" }],
        },
      ],
    },
    { name: "credentialId", label: "Alpha Vantage / FMP Key", type: "credential", accentColor: "green" },
  ],
  outputs: ["price", "open", "high", "low", "volume", "change"],
};
