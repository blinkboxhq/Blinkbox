export default {
  async run(config, input) {
    const b = input?.body ?? input;
    return {
      event:          b?.event || b?.title,
      deployId:       b?.id,
      deployState:    b?.state || b?.deploy_state,
      errorMessage:   b?.error_message,
      siteId:         b?.site_id,
      siteName:       b?.site?.name || b?.name,
      siteUrl:        b?.url || b?.ssl_url || b?.site?.url,
      deployUrl:      b?.deploy_url || b?.links?.permalink,
      branch:         b?.branch || b?.context,
      commitRef:      b?.commit_ref,
      commitUrl:      b?.commit_url,
      committer:      b?.committer,
      title:          b?.title,
      buildId:        b?.build_id,
      deployTime:     b?.deploy_time,
      screenshotUrl:  b?.screenshot_url,
      reviewId:       b?.review_id,
      reviewUrl:      b?.review_url,
      publishedAt:    b?.published_at,
      createdAt:      b?.created_at,
      updatedAt:      b?.updated_at,
    };
  },
};
