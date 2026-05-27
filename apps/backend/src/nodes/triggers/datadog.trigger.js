export default {
  async run(config, input) {
    const b = input?.body ?? input;
    return {
      event:           b?.event_type || b?.alert_type,
      alertId:         b?.id,
      alertName:       b?.alert_title || b?.title,
      alertStatus:     b?.alert_status || b?.status,
      alertMetric:     b?.alert_metric,
      alertQuery:      b?.alert_query,
      alertType:       b?.alert_type,
      alertCycle:      b?.alert_cycle_key,
      alertTransition: b?.alert_transition,
      monitorId:       b?.monitor_id,
      monitorName:     b?.monitor_name,
      monitorType:     b?.monitor_type,
      monitorGroups:   b?.monitor_groups ?? [],
      monitorPriority: b?.monitor_priority,
      orgId:           b?.org?.id,
      orgName:         b?.org?.name,
      hostname:        b?.hostname,
      tags:            b?.tags ?? [],
      logs:            b?.logs ?? [],
      metric:          b?.metric,
      priority:        b?.priority,
      scopes:          b?.scopes,
      snapshotUrl:     b?.snapshot,
      event_url:       b?.event_url || b?.link,
      body:            b?.body || b?.text_only_msg,
      date:            b?.date ? new Date(b.date * 1000).toISOString() : new Date().toISOString(),
    };
  },
};
