export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const events = Array.isArray(b?.events) ? b.events : [b];
    const evt = events[0] ?? {};
    const resource = evt?.resource ?? {};
    const parent = evt?.parent ?? {};
    return {
      event:          evt?.type,
      action:         evt?.action,
      resourceType:   resource?.resource_type,
      resourceGid:    resource?.gid,
      resourceName:   resource?.name,
      parentType:     parent?.resource_type,
      parentGid:      parent?.gid,
      parentName:     parent?.name,
      user:           evt?.user?.name || evt?.user?.gid,
      createdAt:      evt?.created_at,
      allEvents:      events.map(e => ({ type: e.type, action: e.action, gid: e.resource?.gid, name: e.resource?.name })),
      count:          events.length,
    };
  },
};
