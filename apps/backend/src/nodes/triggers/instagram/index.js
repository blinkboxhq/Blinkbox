export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const entry = b?.entry?.[0] ?? {};
    const changes = entry?.changes ?? [];
    const messaging = entry?.messaging?.[0] ?? {};
    const change = changes[0] ?? {};
    const value = change?.value ?? {};
    const media = value?.media ?? {};
    const comment = value?.comment ?? {};
    const message = messaging?.message ?? {};
    return {
      event:          change?.field || (messaging?.message ? "message" : b?.object),
      object:         b?.object,
      accountId:      entry?.id,
      mediaId:        media?.id || value?.media_id,
      mediaType:      media?.media_type,
      mediaUrl:       media?.media_url,
      permalink:      media?.permalink,
      caption:        media?.caption,
      timestamp:      media?.timestamp || entry?.time,
      commentId:      comment?.id || value?.id,
      commentText:    comment?.text || value?.text,
      commentFrom:    comment?.from?.name || value?.from?.name,
      commentFromId:  comment?.from?.id || value?.from?.id,
      likeCount:      value?.like_count,
      mentionMediaId: value?.media_id,
      mentionedIn:    value?.comment_id,
      senderId:       messaging?.sender?.id,
      recipientId:    messaging?.recipient?.id,
      messageText:    message?.text,
      messageAttachments: message?.attachments ?? [],
      isEcho:         message?.is_echo ?? false,
    };
  },
};
