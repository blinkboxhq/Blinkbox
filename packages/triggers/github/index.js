export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const event = input?.githubEvent || input?.headers?.["x-github-event"] || "push";
    const base = {
      event,
      action:    b?.action,
      repoName:  b?.repository?.full_name,
      repoUrl:   b?.repository?.html_url,
      repoOwner: b?.repository?.owner?.login,
      sender:    b?.sender?.login,
      senderUrl: b?.sender?.html_url,
    };
    if (event === "push") {
      return {
        ...base,
        branch:        b?.ref?.replace("refs/heads/", ""),
        tag:           b?.ref?.startsWith("refs/tags/") ? b.ref.replace("refs/tags/", "") : null,
        beforeSha:     b?.before,
        afterSha:      b?.after,
        commitMessage: b?.head_commit?.message,
        commitAuthor:  b?.head_commit?.author?.name,
        commitUrl:     b?.head_commit?.url,
        commits:       (b?.commits ?? []).map(c => ({ id: c.id, message: c.message, author: c.author?.name, url: c.url, added: c.added, modified: c.modified })),
        pushedAt:      b?.head_commit?.timestamp,
        forced:        b?.forced ?? false,
      };
    }
    if (event === "pull_request") {
      const pr = b?.pull_request ?? {};
      return { ...base, prNumber: pr.number, prTitle: pr.title, prState: pr.state, prUrl: pr.html_url, prAuthor: pr.user?.login, baseBranch: pr.base?.ref, headBranch: pr.head?.ref, merged: pr.merged, draft: pr.draft };
    }
    if (event === "issues" || event === "issue_comment") {
      const issue = b?.issue ?? {};
      return { ...base, issueNumber: issue.number, issueTitle: issue.title, issueState: issue.state, issueUrl: issue.html_url, issueAuthor: issue.user?.login, labels: (issue.labels ?? []).map(l => l.name), comment: b?.comment?.body };
    }
    if (event === "release") {
      const rel = b?.release ?? {};
      return { ...base, releaseName: rel.name, tagName: rel.tag_name, releaseUrl: rel.html_url, body: rel.body, prerelease: rel.prerelease, draft: rel.draft, publishedAt: rel.published_at };
    }
    return { ...base, raw: b };
  },
};
