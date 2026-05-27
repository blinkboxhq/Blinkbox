export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const event = b?.event ?? b;
    const previousValue = event?.previousValue ?? {};
    const value = event?.value ?? {};
    return {
      event:          b?.type || event?.type,
      boardId:        event?.boardId,
      boardName:      event?.boardName,
      groupId:        event?.groupId,
      groupName:      event?.groupName,
      itemId:         event?.pulseId || event?.itemId,
      itemName:       event?.pulseName || event?.itemName,
      columnId:       event?.columnId,
      columnTitle:    event?.columnTitle,
      columnType:     event?.columnType,
      newValue:       value?.value || value?.label?.text || value,
      oldValue:       previousValue?.value || previousValue?.label?.text || previousValue,
      userId:         event?.userId,
      userName:       event?.userName,
      userEmail:      event?.userEmail,
      isTopGroup:     event?.isTopGroup,
      createdAt:      event?.createdAt ? new Date(event.createdAt).toISOString() : new Date().toISOString(),
    };
  },
};
