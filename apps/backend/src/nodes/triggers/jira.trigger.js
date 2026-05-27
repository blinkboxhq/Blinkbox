export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const issue = b?.issue ?? {};
    const fields = issue?.fields ?? {};
    const changelog = b?.changelog?.items ?? [];
    return {
      event:         b?.webhookEvent || b?.issue_event_type_name,
      action:        b?.issue_event_type_name,
      issueKey:      issue.key,
      issueId:       issue.id,
      issueSelf:     issue.self,
      summary:       fields.summary,
      description:   fields.description?.content?.[0]?.content?.[0]?.text || fields.description,
      status:        fields.status?.name,
      statusCategory: fields.status?.statusCategory?.name,
      priority:      fields.priority?.name,
      issueType:     fields.issuetype?.name,
      project:       fields.project?.name,
      projectKey:    fields.project?.key,
      reporter:      fields.reporter?.displayName,
      reporterEmail: fields.reporter?.emailAddress,
      assignee:      fields.assignee?.displayName,
      assigneeEmail: fields.assignee?.emailAddress,
      labels:        fields.labels ?? [],
      components:    (fields.components ?? []).map(c => c.name),
      created:       fields.created,
      updated:       fields.updated,
      dueDate:       fields.duedate,
      changelog:     changelog.map(c => ({ field: c.field, from: c.fromString, to: c.toString })),
      user:          b?.user?.displayName,
      userEmail:     b?.user?.emailAddress,
    };
  },
};
