export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const value = Array.isArray(b?.value) ? b.value[0] : (b?.value ?? b);
    const resource = value?.resource ?? b?.resource ?? b;
    return {
      event:            value?.changeType || b?.changeType || "created",
      subscriptionId:   value?.subscriptionId || b?.subscriptionId,
      clientState:      value?.clientState,
      resourceType:     b?.resourceType || "driveItem",
      siteId:           value?.siteId || config.siteId,
      driveId:          value?.driveId,
      itemId:           resource?.id || value?.resourceData?.id,
      itemName:         resource?.name,
      itemPath:         resource?.parentReference?.path,
      itemType:         resource?.folder ? "folder" : "file",
      mimeType:         resource?.file?.mimeType,
      fileSize:         resource?.size,
      webUrl:           resource?.webUrl,
      eTag:             resource?.eTag,
      createdBy:        resource?.createdBy?.user?.displayName,
      lastModifiedBy:   resource?.lastModifiedBy?.user?.displayName,
      createdAt:        resource?.createdDateTime,
      lastModifiedAt:   resource?.lastModifiedDateTime,
      subscriptionExpiry: value?.subscriptionExpirationDateTime,
    };
  },
};
