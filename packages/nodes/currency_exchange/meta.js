const CURRENCIES = ["USD","EUR","GBP","INR","JPY","AUD","CAD","CHF","CNY","SGD","AED","SAR","MXN","BRL","KRW","HKD"];
export default {
  backendType: "currency_exchange",
  label: "Currency Exchange",
  description: "Live FX rates via ExchangeRate-API (free)",
  fields: [
    {
      name: "mode", label: "Mode", type: "options", cols: 3, default: "convert",
      options: [
        { value: "convert", label: "Convert Amount" },
        { value: "rate", label: "Get Rate" },
        { value: "list", label: "All Rates" },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "from", label: "From", type: "options", cols: 4, default: "USD", options: CURRENCIES },
        { name: "to", label: "To", type: "options", cols: 4, default: "INR", options: CURRENCIES },
      ],
    },
    {
      name: "amount", label: "Amount", type: "string", smart: true,
      placeholder: "100  or  {{ $json.amount }}",
      show: { mode: "convert" },
    },
    { type: "notice", variant: "info", text: "No API key required — powered by ExchangeRate-API (free tier)" },
  ],
  outputs: ["result", "rate", "from", "to", "timestamp"],
};
