import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input) {
    const coin = (config.coin || input?.coin || "bitcoin").toLowerCase().replace(/\s+/g, "-");
    const currency = (config.currency || "usd").toLowerCase();
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
      { timeout: TIMEOUT }
    );
    const data = res.data[coin];
    if (!data) return { success: false, error: `crypto_price: coin '${coin}' not found on CoinGecko.`, skipped: true };
    return {
      coin, currency: currency.toUpperCase(),
      price: data[currency],
      change24h: data[`${currency}_24h_change`],
      marketCap: data[`${currency}_market_cap`],
      volume24h: data[`${currency}_24h_vol`],
      checkedAt: new Date().toISOString(),
    };
  },
};
