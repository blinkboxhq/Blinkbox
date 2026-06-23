export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const resource = b?.resource ?? {};
    const fields = resource?.fields ?? {};
    return {
      event:            b?.eventType,
      eventId:          b?.id,
      publisherId:      b?.publisherId,
      subscriptionId:   b?.subscriptionId,
      collectionUrl:    b?.resourceContainers?.collection?.href,
      projectId:        b?.resourceContainers?.project?.id,
      workItemId:       resource?.id || resource?.workItemId,
      workItemType:     fields?.["System.WorkItemType"],
      title:            fields?.["System.Title"] || resource?.title,
      state:            fields?.["System.State"],
      assignedTo:       fields?.["System.AssignedTo"]?.displayName || fields?.["System.AssignedTo"],
      createdBy:        fields?.["System.CreatedBy"]?.displayName || fields?.["System.CreatedBy"],
      areaPath:         fields?.["System.AreaPath"],
      iterationPath:    fields?.["System.IterationPath"],
      teamProject:      fields?.["System.TeamProject"],
      priority:         fields?.["Microsoft.VSTS.Common.Priority"],
      severity:         fields?.["Microsoft.VSTS.Common.Severity"],
      url:              resource?.url || resource?._links?.html?.href,
      revision:         resource?.rev,
      buildId:          resource?.id,
      buildNumber:      resource?.buildNumber,
      buildStatus:      resource?.status,
      buildResult:      resource?.result,
      repoId:           resource?.repository?.id,
      repoName:         resource?.repository?.name,
      branch:           resource?.sourceBranch?.replace("refs/heads/", ""),
      commitId:         resource?.sourceVersion,
      prId:             resource?.pullRequestId,
      prTitle:          resource?.title,
      prStatus:         resource?.status,
      createdAt:        b?.createdDate || resource?.startTime,
    };
  },
};
