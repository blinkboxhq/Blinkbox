export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const account = b?.account ?? {};
    const status = b?.status ?? b;
    const reblog = status?.reblog ?? {};
    return {
      event:           b?.event || "status.created",
      statusId:        status?.id,
      uri:             status?.uri,
      url:             status?.url,
      content:         status?.content?.replace(/<[^>]+>/g, "") || status?.text,
      visibility:      status?.visibility,
      language:        status?.language,
      spoilerText:     status?.spoiler_text,
      isSensitive:     status?.sensitive,
      inReplyToId:     status?.in_reply_to_id,
      inReplyToAccount: status?.in_reply_to_account_id,
      isReblog:        !!reblog?.id,
      reblogId:        reblog?.id,
      reblogUrl:       reblog?.url,
      reblogsCount:    status?.reblogs_count,
      favouritesCount: status?.favourites_count,
      repliesCount:    status?.replies_count,
      accountId:       account?.id,
      accountUsername: account?.username || account?.acct,
      accountDisplayName: account?.display_name,
      accountUrl:      account?.url,
      accountFollowers: account?.followers_count,
      accountVerified: account?.verified ?? false,
      mediaAttachments: (status?.media_attachments ?? []).map(m => ({ type: m.type, url: m.url, description: m.description })),
      tags:            (status?.tags ?? []).map(t => t.name),
      mentions:        (status?.mentions ?? []).map(m => m.acct),
      card:            status?.card?.url,
      createdAt:       status?.created_at,
    };
  },
};
