export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const event = b?.event_type || b?.type;
    const file = b?.file ?? {};
    const comment = b?.comment ?? b?.comments?.[0] ?? {};
    return {
      event:          event,
      passCode:       b?.passcode,
      fileKey:        b?.file_key || file.key,
      fileName:       b?.file_name || file.name,
      fileUrl:        b?.file_key ? `https://www.figma.com/file/${b.file_key}` : null,
      versionId:      b?.version_id,
      versionLabel:   b?.label,
      description:    b?.description,
      commentId:      comment?.id,
      commentText:    comment?.message,
      commentAuthor:  comment?.client_meta || comment?.user?.handle,
      commentParentId: comment?.parent_id,
      commentCreatedAt: comment?.created_at,
      resolvedAt:     comment?.resolved_at,
      timestamp:      b?.timestamp,
      triggeredBy:    b?.triggered_by?.handle || b?.created_by?.handle,
    };
  },
};
