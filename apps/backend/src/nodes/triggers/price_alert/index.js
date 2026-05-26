import axios from "axios";

export default {
  async run(config, input) {
    if (input?.price != null) return input;
    const symbol = (config.symbol || config.ticker || "BTC").toUpperCase();
    const currency = (config.currency || "USD").toUpperCase();
    let price, change24h, changePercent24h, high24h, low24h, volume24h, marketCap, source;
    try {
      if (config.source === "coingecko" || !config.source) {
        const id = config.coinId || symbol.toLowerCase().replace("usdt", "").replace("usd", "");
        const { data } = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
          params: { ids: id, vs_currencies: currency.toLowerCase(), include_24hr_change: true, include_24hr_vol: true, include_market_cap: true },
          timeout: 10000,
        });
        const coin = data?.[id];
        price = coin?.[currency.toLowerCase()];
        changePercent24h = coin?.[`${currency.toLowerCase()}_24h_change`];
        volume24h = coin?.[`${currency.toLowerCase()}_24h_vol`];
        marketCap = coin?.[`${currency.toLowerCase()}_market_cap`];
        source = "coingecko";
      } else if (config.source === "binance") {
        const { data } = await axios.get(`https://api.binance.com/api/v3/ticker/24hr`, { params: { symbol: `${symbol}USDT` }, timeout: 10000 });
        price = parseFloat(data?.lastPrice);
        change24h = parseFloat(data?.priceChange);
        changePercent24h = parseFloat(data?.priceChangePercent);
        high24h = parseFloat(data?.highPrice);
        low24h = parseFloat(data?.lowPrice);
        volume24h = parseFloat(data?.quoteVolume);
        source = "binance";
      }
    } catch (err) {
      throw new Error(`[price_alert_trigger] Failed to fetch price for ${symbol}: ${err.message}`);
    }
    const threshold = config.alertThreshold ? parseFloat(config.alertThreshold) : null;
    const alertType = config.alertType || "above";
    const triggered = threshold != null ? (alertType === "above" ? price >= threshold : price <= threshold) : true;
    return {
      symbol, currency, price, change24h, changePercent24h, high24h, low24h, volume24h, marketCap, source,
      threshold, alertType, triggered, priceFormatted: price ? `${currency} ${price.toLocaleString()}` : null,
      checkedAt: new Date().toISOString(),
    };
  },
};
