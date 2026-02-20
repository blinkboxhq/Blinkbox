const execution = await Execution.create({
  automationId: automation._id,
  name: automation.name,
  trigger: automation.trigger,
  status: "pending",

  // 🔥 PHASE 8 ADDITIONS
  workspaceId: meta.workspaceId,
  idempotencyKey: meta.idempotencyKey || null,

  context: payload,
  cursors: [
    {
      nodeId: automation.entryNodeId,
      status: "pending",
      retries: 0,
      resumeAt: null,
      lockedAt: null,
      lockedBy: null,
      parentCursorId: null,
    },
  ],
});
