export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const event = input?.githubEvent || input?.headers?.["x-github-event"] || (b?.action ? "issues" : "push");
    const issue = b?.issue ?? {};
    const pr = b?.pull_request ?? {};
    const label = b?.label ?? {};
    const milestone = b?.milestone ?? {};
    const comment = b?.comment ?? {};
    const assignee = b?.assignee ?? {};
    const isPR = !!pr.number;
    const base = {
      event: `${event}.${b?.action}`, action: b?.action,
      repoName: b?.repository?.full_name, repoUrl: b?.repository?.html_url, repoOwner: b?.repository?.owner?.login,
      sender: b?.sender?.login, senderUrl: b?.sender?.html_url, senderType: b?.sender?.type,
    };
    if (isPR) {
      return { ...base, isPR: true, number: pr.number, title: pr.title, state: pr.state, url: pr.html_url, author: pr.user?.login, baseBranch: pr.base?.ref, headBranch: pr.head?.ref, body: pr.body, draft: pr.draft, merged: pr.merged, mergedBy: pr.merged_by?.login, mergedAt: pr.merged_at, additions: pr.additions, deletions: pr.deletions, changedFiles: pr.changed_files, labels: (pr.labels ?? []).map(l => l.name), requestedReviewers: (pr.requested_reviewers ?? []).map(r => r.login), milestone: pr.milestone?.title, createdAt: pr.created_at, updatedAt: pr.updated_at };
    }
    return {
      ...base, isPR: false,
      number: issue.number, title: issue.title, state: issue.state, url: issue.html_url,
      author: issue.user?.login, body: issue.body,
      labels: (issue.labels ?? []).map(l => l.name),
      assignees: (issue.assignees ?? []).map(a => a.login),
      milestone: milestone.title || issue.milestone?.title,
      labelAdded: b?.action === "labeled" ? label.name : null,
      labelRemoved: b?.action === "unlabeled" ? label.name : null,
      assigneeAdded: b?.action === "assigned" ? assignee.login : null,
      commentId: comment.id, commentBody: comment.body, commentAuthor: comment.user?.login,
      closedAt: issue.closed_at, createdAt: issue.created_at, updatedAt: issue.updated_at,
    };
  },
};
