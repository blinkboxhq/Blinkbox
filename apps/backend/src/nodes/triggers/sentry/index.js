export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const data = b?.data ?? {};
    const event = data?.event ?? data?.issue ?? {};
    const actor = b?.actor ?? {};
    return {
      action:        b?.action,
      trigger:       b?.trigger,
      installationId: b?.installation?.uuid,
      issueId:       event.id,
      issueTitle:    event.title,
      issueLevel:    event.level,
      issuePlatform: event.platform,
      issueType:     event.type || event.issue_type,
      issueStatus:   event.status,
      issueUrl:      event.web_url || event.url,
      project:       event.project,
      projectId:     event.project_id,
      projectSlug:   event.project_slug,
      organization:  event.organization?.name || b?.organization?.slug,
      environment:   event.environment,
      culprit:       event.culprit,
      errorType:     event.metadata?.type,
      errorValue:    event.metadata?.value,
      errorFilename: event.metadata?.filename,
      firstSeen:     event.firstSeen,
      lastSeen:      event.lastSeen,
      timesSeenCount: event.count,
      actor:         actor.name || actor.email,
      actorType:     actor.type,
      receivedAt:    new Date().toISOString(),
    };
  },
};
