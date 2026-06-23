export default {
  async run(config, input) {
    const data = Array.isArray(input) ? input : input?.items || [];
    const field = config.field;
    if (field) {
      const counts = {};
      for (const item of data) {
        const key = String(item[field] ?? "null");
        counts[key] = (counts[key] || 0) + 1;
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return { counts, sorted: sorted.map(([value, count]) => ({ value, count })), total: data.length };
    }
    return { count: Array.isArray(data) ? data.length : 1, total: Array.isArray(data) ? data.length : 1 };
  },
};
