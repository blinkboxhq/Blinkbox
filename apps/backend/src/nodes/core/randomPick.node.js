export default {
  async run(config, input) {
    const items = config.items || input?.items || input;
    const arr = Array.isArray(items) ? items : String(items).split(",").map((s) => s.trim());
    if (!arr.length) return { success: false, error: "random_pick: 'items' array is required.", skipped: true };
    const count = Math.min(parseInt(config.count || 1), arr.length);
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);
    return { result: count === 1 ? picked[0] : picked, items: picked, index: arr.indexOf(picked[0]) };
  },
};
