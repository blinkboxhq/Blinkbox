export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const data = b?.data?.item ?? b?.data ?? b;
    const user = data?.user ?? data?.contact ?? data?.author ?? {};
    const convo = data?.conversation ?? {};
    return {
      event:             b?.topic || b?.type,
      appId:             b?.app_id,
      objectType:        data?.type,
      objectId:          data?.id,
      userId:            user?.id,
      userName:          user?.name,
      userEmail:         user?.email,
      userType:          user?.type,
      conversationId:    convo?.id || data?.conversation_id,
      conversationState: convo?.state,
      conversationUrl:   convo?.id ? `https://app.intercom.com/a/apps/-/inbox/conversation/${convo.id}` : null,
      messageBody:       data?.conversation_message?.body || data?.body || data?.message?.body,
      messageType:       data?.conversation_message?.message_type || data?.type,
      assigneeId:        convo?.assignee?.id,
      assigneeName:      convo?.assignee?.name,
      teamId:            convo?.team_assignee_id,
      tags:              (data?.tags?.tags ?? []).map(t => t.name),
      createdAt:         data?.created_at ? new Date(data.created_at * 1000).toISOString() : null,
      updatedAt:         data?.updated_at ? new Date(data.updated_at * 1000).toISOString() : null,
    };
  },
};
