export default {
  async run(config, input) {
    const b    = input?.body ?? input;
    const data = b?.data    ?? {};
    return {
      type:     b?.type     ?? "",
      action:   b?.action   ?? "",
      id:       data.id     ?? null,
      title:    data.title  ?? "",
      state:    data.state  ?? {},
      priority: data.priority ?? null,
      assignee: data.assignee ?? {},
      team:     data.team     ?? {},
      project:  data.project  ?? {},
      labels:   data.labels   ?? [],
      url:      data.url      ?? "",
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
      issue:    data,
    };
  },
};
