import crypto from "crypto";

export default {
  async run(config, input) {
    const b = input?.body ?? input;

    if (config.webhookSecret && input?.rawBody && input?.signature) {
      const sig = crypto.createHmac("sha256", config.webhookSecret).update(input.rawBody).digest("hex");
      if (sig !== input.signature) throw new Error("[airtable_trigger] Invalid webhook signature");
    }

    // ── Airtable webhook payload structure ────────────────────────────────────
    // Airtable sends a lightweight notification; full record data may need fetching.
    // When the full payload is available (e.g. via polling), parse it directly.
    const timestamp   = b.timestamp   ?? b.createdTime ?? new Date().toISOString();
    const actionType  = b.actionMetadata?.source === "client" ? "user" : b.actionMetadata?.source ?? "unknown";

    const changedFields  = b.changedFieldsById   ?? {};
    const createdRecords = b.createdRecordsById   ?? {};
    const destroyedIds   = b.destroyedRecordIds   ?? [];
    const changedRecords = b.changedRecordsById   ?? {};

    const allChangedIds = [
      ...Object.keys(changedRecords),
      ...Object.keys(createdRecords),
    ];

    const firstRecord = changedRecords[allChangedIds[0]] ?? createdRecords[allChangedIds[0]] ?? b;

    const fields = firstRecord?.current?.cellValuesByFieldId
      ?? firstRecord?.fields
      ?? firstRecord?.cellValues
      ?? {};

    return {
      tableId:      b.tableId        ?? b.table_id    ?? "",
      baseId:       b.baseId         ?? b.base_id     ?? config.baseId ?? "",
      webhookId:    b.webhookId       ?? "",
      timestamp,
      actionType,
      recordId:     allChangedIds[0] ?? b.id          ?? "",
      fields,
      changedFields:  Object.keys(changedFields),
      createdRecordIds: Object.keys(createdRecords),
      destroyedRecordIds: destroyedIds,
      changedRecordIds:   Object.keys(changedRecords),
      record: firstRecord,
      raw: b,
    };
  },
};
