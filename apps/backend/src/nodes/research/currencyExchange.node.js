import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input) {
    const from = (config.from || input?.from || "USD").toUpperCase();
    const to = (config.to || input?.to || "EUR").toUpperCase();
    const amount = parseFloat(config.amount ?? input?.amount ?? 1);

    try {
      const res = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`, { timeout: TIMEOUT });
      const rate = res.data.rates?.[to];
      if (!rate) throw new Error(`Currency "${to}" not found.`);
      return { from, to, amount, rate, converted: Math.round(amount * rate * 10000) / 10000, date: res.data.date };
    } catch (err) {
      throw new Error(`currency_exchange: ${err.message}`);
    }
  },
};
