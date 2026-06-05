export default {
  async run(config, input) {
    const data = Array.isArray(input?.data) ? input.data : Array.isArray(input) ? input : [];
    const page = parseInt(config.page ?? input?.page ?? 1);
    const pageSize = parseInt(config.pageSize ?? config.limit ?? 10);
    const total = data.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const items = data.slice(start, start + pageSize);
    return { items, page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
  },
};
