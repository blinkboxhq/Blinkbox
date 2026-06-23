import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input) {
    const symbol = (config.symbol || input?.symbol || "AAPL").toUpperCase();
    const apiKey = config.apiKey || process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      const res = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`, { timeout: TIMEOUT });
      const meta = res.data.chart?.result?.[0]?.meta;
      return { symbol, price: meta?.regularMarketPrice, currency: meta?.currency, exchange: meta?.exchangeName, previousClose: meta?.previousClose, source: "yahoo" };
    }
    const res = await axios.get("https://www.alphavantage.co/query", {
      params: { function: "GLOBAL_QUOTE", symbol, apikey: apiKey },
      timeout: TIMEOUT,
    });
    const q = res.data["Global Quote"];
    return { symbol, price: parseFloat(q?.["05. price"]), change: parseFloat(q?.["09. change"]), changePercent: q?.["10. change percent"], high: parseFloat(q?.["03. high"]), low: parseFloat(q?.["04. low"]), volume: parseInt(q?.["06. volume"]), source: "alphavantage" };
  },
};
