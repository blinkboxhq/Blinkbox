export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const task = b?.task_id ? { id: b.task_id } : (b?.task ?? {});
    const history = b?.history_items?.[0] ?? {};
    return {
      event:          b?.event,
      webhookId:      b?.webhook_id,
      taskId:         task?.id || b?.task_id,
      taskName:       task?.name,
      taskUrl:        task?.url,
      taskStatus:     task?.status?.status,
      taskStatusColor: task?.status?.color,
      taskPriority:   task?.priority?.priority,
      taskAssignees:  (task?.assignees ?? []).map(a => ({ id: a.id, name: a.username, email: a.email })),
      taskDueDate:    task?.due_date ? new Date(Number(task.due_date)).toISOString() : null,
      taskStartDate:  task?.start_date ? new Date(Number(task.start_date)).toISOString() : null,
      listId:         task?.list?.id || b?.list_id,
      listName:       task?.list?.name,
      folderId:       task?.folder?.id,
      folderName:     task?.folder?.name,
      spaceId:        task?.space?.id,
      fieldChanged:   history?.field,
      oldValue:       history?.before?.status || history?.before,
      newValue:       history?.after?.status || history?.after,
      changedBy:      b?.history_items?.[0]?.user?.username,
      createdAt:      new Date().toISOString(),
    };
  },
};
