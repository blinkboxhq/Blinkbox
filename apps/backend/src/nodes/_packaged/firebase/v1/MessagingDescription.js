/**
 * FIREBASE — Cloud Messaging resource. sendNotification preserved verbatim from
 * the monolith; sendToToken, sendToTopic, subscribeToTopic and
 * unsubscribeFromTopic added for parity. Handlers receive (config, { messaging }).
 */
import { parseJson } from "../GenericFunctions.js";

function buildNotification(config) {
  const { title, body } = config;
  const notification = {};
  if (title !== undefined) notification.title = title;
  if (body !== undefined) notification.body = body;
  return Object.keys(notification).length ? notification : undefined;
}

async function opSendNotification(config, { messaging }) {
  const { token, title, body } = config;
  if (!token || !title) return { success: false, error: "Firebase: 'token' and 'title' are required.", skipped: true };
  const message = { token, notification: { title, body }, data: config.data ? parseJson(config.data, "data") : undefined };
  const id = await messaging.send(message);
  return { messageId: id, sent: true };
}

async function opSendToToken(config, { messaging }) {
  const { token } = config;
  if (!token) return { success: false, error: "Firebase sendToToken: 'token' is required.", skipped: true };
  const message = {
    token,
    notification: buildNotification(config),
    data: config.data ? parseJson(config.data, "data") : undefined,
  };
  const id = await messaging.send(message);
  return { messageId: id, sent: true };
}

async function opSendToTopic(config, { messaging }) {
  const { topic } = config;
  if (!topic) return { success: false, error: "Firebase sendToTopic: 'topic' is required.", skipped: true };
  const message = {
    topic,
    notification: buildNotification(config),
    data: config.data ? parseJson(config.data, "data") : undefined,
  };
  const id = await messaging.send(message);
  return { messageId: id, topic, sent: true };
}

function tokensFrom(config) {
  const raw = config.tokens;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") return raw.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

async function opSubscribeToTopic(config, { messaging }) {
  const { topic } = config;
  const tokens = tokensFrom(config);
  if (!topic || !tokens.length) return { success: false, error: "Firebase subscribeToTopic: 'topic' and 'tokens' are required.", skipped: true };
  const res = await messaging.subscribeToTopic(tokens, topic);
  return { topic, successCount: res.successCount, failureCount: res.failureCount };
}

async function opUnsubscribeFromTopic(config, { messaging }) {
  const { topic } = config;
  const tokens = tokensFrom(config);
  if (!topic || !tokens.length) return { success: false, error: "Firebase unsubscribeFromTopic: 'topic' and 'tokens' are required.", skipped: true };
  const res = await messaging.unsubscribeFromTopic(tokens, topic);
  return { topic, successCount: res.successCount, failureCount: res.failureCount };
}

export const messagingOperations = {
  sendNotification: opSendNotification,
  sendToToken: opSendToToken,
  sendToTopic: opSendToTopic,
  subscribeToTopic: opSubscribeToTopic,
  unsubscribeFromTopic: opUnsubscribeFromTopic,
};
