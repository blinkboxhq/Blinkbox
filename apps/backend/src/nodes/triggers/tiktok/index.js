export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const video = b?.video ?? b?.data?.video ?? b;
    const author = b?.author ?? b?.data?.author ?? {};
    return {
      event:          b?.event || b?.type,
      videoId:        video?.id,
      videoTitle:     video?.title,
      videoDesc:      video?.desc,
      videoUrl:       video?.play_url || video?.download_url,
      coverUrl:       video?.cover,
      duration:       video?.duration,
      width:          video?.width,
      height:         video?.height,
      ratio:          video?.ratio,
      likeCount:      video?.digg_count || video?.like_count,
      commentCount:   video?.comment_count,
      shareCount:     video?.share_count,
      viewCount:      video?.play_count || video?.view_count,
      downloadCount:  video?.download_count,
      authorId:       author?.id || b?.open_id,
      authorName:     author?.nickname,
      authorUsername: author?.unique_id,
      authorFollowers: author?.follower_count,
      authorVerified: author?.verified,
      hashtags:       (video?.text_extra ?? []).filter(t => t.hashtag_name).map(t => t.hashtag_name),
      mentions:       (video?.text_extra ?? []).filter(t => t.user_id).map(t => t.user_id),
      musicTitle:     b?.music?.title,
      isAd:           video?.is_ad ?? false,
      createTime:     video?.create_time ? new Date(video.create_time * 1000).toISOString() : null,
    };
  },
};
