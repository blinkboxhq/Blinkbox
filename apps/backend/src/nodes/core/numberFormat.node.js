export default {
  async run(config, input) {
    const value = parseFloat(config.value ?? input?.value ?? 0);
    const locale = config.locale || "en-US";
    const style = config.style || "decimal";
    const currency = config.currency || "USD";
    const decimals = config.decimals !== undefined ? parseInt(config.decimals) : undefined;

    const opts = { style };
    if (style === "currency") opts.currency = currency;
    if (decimals !== undefined) { opts.minimumFractionDigits = decimals; opts.maximumFractionDigits = decimals; }

    const result = new Intl.NumberFormat(locale, opts).format(value);
    return { result, value, locale, style };
  },
};
