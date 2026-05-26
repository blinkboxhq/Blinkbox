export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const messages = Array.isArray(b?.messages) ? b.messages : (b?.message ? [b.message] : [b]);
    const msg = messages[0] ?? {};
    const incident = msg?.incident ?? msg?.data?.incident ?? msg?.data ?? {};
    const service = incident?.service ?? {};
    const assignment = incident?.assignments?.[0] ?? {};
    return {
      event:           msg?.event || msg?.event_type,
      messageType:     msg?.type,
      incidentId:      incident?.id,
      incidentNumber:  incident?.incident_number,
      incidentKey:     incident?.incident_key,
      title:           incident?.title || incident?.description,
      status:          incident?.status,
      urgency:         incident?.urgency,
      priority:        incident?.priority?.name,
      serviceName:     service?.name || service?.summary,
      serviceId:       service?.id,
      serviceUrl:      service?.html_url,
      assigneeName:    assignment?.assignee?.summary,
      assigneeEmail:   assignment?.assignee?.email,
      escalationPolicy: incident?.escalation_policy?.summary,
      teamName:        incident?.teams?.[0]?.summary,
      body:            incident?.body?.details,
      resolvedAt:      incident?.resolved_at,
      acknowledgedAt:  incident?.acknowledgements?.[0]?.at,
      createdAt:       incident?.created_at,
      incidentUrl:     incident?.html_url,
      allMessages:     messages.map(m => ({ event: m.event, id: m.incident?.id })),
    };
  },
};
