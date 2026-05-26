export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const kind = b?.object_kind || b?.event_type || "push";
    const base = { event: kind, projectName: b?.project?.name, projectUrl: b?.project?.web_url, namespace: b?.project?.namespace };
    if (kind === "push" || kind === "tag_push") {
      return { ...base, branch: b?.ref?.replace("refs/heads/", ""), tag: b?.ref?.replace("refs/tags/", ""), sha: b?.checkout_sha, commits: (b?.commits ?? []).map(c => ({ id: c.id, message: c.message, author: c.author?.name, url: c.url })), totalCommits: b?.total_commits_count, pusher: b?.user_name };
    }
    if (kind === "merge_request") {
      const mr = b?.object_attributes ?? {};
      return { ...base, mrId: mr.iid, mrTitle: mr.title, mrState: mr.state, mrUrl: mr.url, action: mr.action, sourceBranch: mr.source_branch, targetBranch: mr.target_branch, author: b?.user?.name, mergedAt: mr.merged_at };
    }
    if (kind === "issue") {
      const iss = b?.object_attributes ?? {};
      return { ...base, issueId: iss.iid, issueTitle: iss.title, issueState: iss.state, issueUrl: iss.url, action: iss.action, author: b?.user?.name, labels: (b?.labels ?? []).map(l => l.title) };
    }
    if (kind === "pipeline") {
      const pipe = b?.object_attributes ?? {};
      return { ...base, pipelineId: pipe.id, status: pipe.status, ref: pipe.ref, sha: pipe.sha, duration: pipe.duration, stages: pipe.stages };
    }
    if (kind === "note") {
      const note = b?.object_attributes ?? {};
      return { ...base, noteId: note.id, body: note.note, noteType: note.noteable_type, url: note.url, author: b?.user?.name };
    }
    return { ...base, raw: b };
  },
};
