export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const ticket = b?.ticket ?? b?.data?.ticket ?? b;
    const requester = ticket?.requester ?? {};
    const assignee = ticket?.assignee ?? {};
    return {
      event:           b?.type || b?.event,
      ticketId:        ticket?.id,
      ticketUrl:       ticket?.url,
      subject:         ticket?.subject,
      description:     ticket?.description || ticket?.latest_comment?.body,
      status:          ticket?.status,
      priority:        ticket?.priority,
      type:            ticket?.type,
      channel:         ticket?.via?.channel || ticket?.created_via?.channel,
      tags:            ticket?.tags ?? [],
      requesterName:   requester?.name,
      requesterEmail:  requester?.email || requester?.default_email,
      requesterId:     requester?.id,
      assigneeName:    assignee?.name,
      assigneeEmail:   assignee?.email,
      assigneeId:      assignee?.id,
      groupName:       ticket?.group?.name,
      groupId:         ticket?.group?.id,
      organizationId:  ticket?.organization_id,
      satisfactionRating: ticket?.satisfaction_rating?.score,
      externalId:      ticket?.external_id,
      customFields:    ticket?.custom_fields ?? [],
      createdAt:       ticket?.created_at,
      updatedAt:       ticket?.updated_at,
    };
  },
};
