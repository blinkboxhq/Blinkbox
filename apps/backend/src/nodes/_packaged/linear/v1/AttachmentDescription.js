/**
 * Linear — Attachment resource. Handlers receive `(config, apiKey)`.
 */
import { gql } from "../GenericFunctions.js";

async function opCreateAttachment(config, apiKey) {
  if (!config.issueId || !config.url) return { success: false, error: "Linear createAttachment: 'issueId' and 'url' are required.", skipped: true };
  if (!/^https?:\/\//i.test(config.url)) return { success: false, error: "Linear createAttachment: 'url' must be http(s).", skipped: true };
  const input = { issueId: config.issueId, url: config.url, title: config.title || config.url };
  const data = await gql(`mutation($input: AttachmentCreateInput!) { attachmentCreate(input: $input) { success attachment { id } } }`, { input }, apiKey);
  return { id: data.attachmentCreate.attachment.id, created: true };
}

export const attachmentOperations = {
  createAttachment: opCreateAttachment,
};
