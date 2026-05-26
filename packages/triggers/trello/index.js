export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const action = b?.action ?? {};
    const data = action?.data ?? {};
    const board = data?.board ?? {};
    const card = data?.card ?? {};
    const list = data?.list ?? {};
    return {
      event:       action?.type,
      actionId:    action?.id,
      boardId:     board?.id,
      boardName:   board?.name,
      cardId:      card?.id,
      cardName:    card?.name,
      cardShortUrl: card?.shortLink ? `https://trello.com/c/${card.shortLink}` : null,
      cardDesc:    card?.desc,
      listId:      list?.id || data?.listAfter?.id,
      listName:    list?.name || data?.listAfter?.name,
      fromList:    data?.listBefore?.name,
      toList:      data?.listAfter?.name,
      memberName:  action?.memberCreator?.fullName,
      memberUsername: action?.memberCreator?.username,
      checklistName: data?.checklist?.name,
      checkItemName: data?.checkItem?.name,
      checkItemState: data?.checkItem?.state,
      text:        data?.text,
      date:        action?.date,
    };
  },
};
