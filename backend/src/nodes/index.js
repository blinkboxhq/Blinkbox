import sendEmail from "./sendEmail.node.js";
import callWebhook from "./callWebhook.node.js";
import condition from "./condition.node.js";
import delay from "./delay.node.js";
import logNode from "./log.node.js";

export const nodeRegistry = {
  send_email: sendEmail,
  call_webhook: callWebhook,
  condition,
  delay,
  log: logNode,
};
