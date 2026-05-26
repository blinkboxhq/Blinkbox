export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const payload = b?.payload ?? b;
    const deployment = payload?.deployment ?? payload;
    const project = payload?.project ?? {};
    const links = deployment?.links ?? {};
    return {
      event:          b?.type || payload?.type,
      deploymentId:   deployment?.id,
      deploymentName: deployment?.name,
      url:            deployment?.url ? `https://${deployment.url}` : links?.deployment,
      inspectorUrl:   links?.inspectorV2 || links?.inspector,
      projectId:      project?.id || deployment?.projectId,
      projectName:    project?.name || deployment?.name,
      teamId:         payload?.teamId || b?.teamId,
      state:          deployment?.readyState || deployment?.state,
      target:         deployment?.target || deployment?.meta?.githubDeployment,
      branch:         deployment?.meta?.githubCommitRef || deployment?.gitSource?.ref,
      commitSha:      deployment?.meta?.githubCommitSha,
      commitMessage:  deployment?.meta?.githubCommitMessage,
      authorName:     deployment?.meta?.githubCommitAuthorName,
      createdAt:      deployment?.createdAt ? new Date(deployment.createdAt).toISOString() : null,
      buildingAt:     deployment?.buildingAt ? new Date(deployment.buildingAt).toISOString() : null,
      readyAt:        deployment?.ready ? new Date(deployment.ready).toISOString() : null,
      error:          deployment?.errorMessage || null,
      regions:        deployment?.regions ?? [],
    };
  },
};
