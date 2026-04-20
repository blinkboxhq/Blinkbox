import axios from "axios";
import { BACKEND_URL } from "../config/env.js";
import Automation from "../models/automation.model.js";

/**
 * Registers the Blinkbox webhook URL with the Telegram Bot API.
 * Uses the setWebhook method to tell Telegram where to send updates.
 *
 * @param {string} automationId - The Blinkbox automation ID
 * @param {string} botToken - The Telegram Bot API token
 * @param {string[]} updateTypes - Array of update types to receive (default: ["message"])
 * @param {string} secretToken - Optional secret token for X-Telegram-Bot-Api-Secret-Token verification
 */
export async function registerTelegramWebhook(automationId, botToken, updateTypes = ["message"], secretToken = "") {
  const webhookUrl = `${BACKEND_URL}/webhook/${automationId}`;

  try {
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      url: webhookUrl,
      allowed_updates: updateTypes,
      secret_token: secretToken || undefined,
      drop_pending_updates: true,
    }, { timeout: 10000 });

    if (!response.data?.ok) {
      throw new Error(response.data?.description || "Failed to register Telegram webhook");
    }

    // Update automation config to mark webhook as registered
    await Automation.findByIdAndUpdate(automationId, {
      "data.config.webhookRegistered": true,
      "data.config.telegramWebhookUrl": webhookUrl,
    });

    console.log(`[Telegram] Registered webhook for automation ${automationId}`);
    return response.data;
  } catch (err) {
    const msg = err.response?.data?.description || err.message;
    console.error(`[Telegram] Webhook registration failed for ${automationId}:`, msg);
    throw new Error(`Telegram: ${msg}`);
  }
}

/**
 * Removes the webhook registration from Telegram.
 *
 * @param {string} botToken - The Telegram Bot API token
 */
export async function unregisterTelegramWebhook(botToken) {
  try {
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
      drop_pending_updates: true,
    }, { timeout: 10000 });

    return response.data;
  } catch (err) {
    const msg = err.response?.data?.description || err.message;
    console.error(`[Telegram] Webhook removal failed:`, msg);
    // Don't throw, just log — unregistration failure during delete is usually non-fatal
    return { ok: false, error: msg };
  }
}
