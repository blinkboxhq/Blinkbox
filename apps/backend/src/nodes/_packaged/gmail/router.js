/**
 * Gmail — operation router. Merges every v1 resource map into one dispatch
 * table. Every handler is called `(config, token)`; the slim entry resolves
 * the Google OAuth2 access token and passes it in.
 */
import { handleError } from "./GenericFunctions.js";
import { messageOperations } from "./v1/MessageDescription.js";
import { draftOperations } from "./v1/DraftDescription.js";
import { labelOperations } from "./v1/LabelDescription.js";
import { threadOperations } from "./v1/ThreadDescription.js";
import { profileOperations } from "./v1/ProfileDescription.js";

export const OPERATIONS = {
  ...messageOperations,
  ...draftOperations,
  ...labelOperations,
  ...threadOperations,
  ...profileOperations,
};

export const DEFAULT_OPERATION = "sendEmail";
export const OPERATION_SCHEMA = {
  sendEmail:    { description: "Send a new email", recommended: true, scopes: ["gmail.send"] },
  replyToEmail: { description: "Reply to a message, keeping the thread", recommended: true, scopes: ["gmail.send"] },
  searchEmails: { description: "Search the mailbox with Gmail query syntax", recommended: true, scopes: ["gmail.readonly"] },
  readEmail:    { description: "Read one message by ID, including its body", recommended: true, scopes: ["gmail.readonly"] },
  addLabel:     { description: "Apply a label to a message", recommended: true, scopes: ["gmail.modify"] },
  forwardEmail: { description: "Forward a message to other recipients", scopes: ["gmail.send"] },
  createDraft:  { description: "Save a draft without sending it", scopes: ["gmail.compose"] },
  archiveEmail: { description: "Remove a message from the inbox", scopes: ["gmail.modify"] },
  deleteEmail:  { description: "Move a message to trash", scopes: ["gmail.modify"] },
  getThread:    { description: "Read every message in a thread", scopes: ["gmail.readonly"] },
};


export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Gmail: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}
