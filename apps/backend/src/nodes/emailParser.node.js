/**
 * EMAIL PARSER NODE
 * Extract structured data from email content using AI.
 * Preset schemas for Invoice, Order, Contact, Meeting. Custom schema support.
 *
 * Config:
 *   operation     — extractInvoice | extractOrder | extractContact | extractMeeting | extractCustom
 *   emailText     — raw email body (supports {{ expressions }})
 *   emailSubject  — email subject for context
 *   emailFrom     — sender for context
 *   customSchema  — for extractCustom: "name, email, amount" or JSON field array
 *   provider      — "openai" (default) | "anthropic"
 *   model         — LLM model ID (default: gpt-4o-mini)
 *   credentialId  — API key in vault
 */

import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

const SCHEMAS = {
  extractInvoice: {
    fields: [
      { name: "invoiceNumber", type: "string" },
      { name: "invoiceDate", type: "string" },
      { name: "dueDate", type: "string" },
      { name: "totalAmount", type: "number" },
      { name: "currency", type: "string" },
      { name: "vendorName", type: "string" },
      { name: "vendorEmail", type: "string" },
      { name: "lineItems", type: "array", description: "array of {description, quantity, unitPrice, total}" },
      { name: "taxAmount", type: "number" },
      { name: "paymentStatus", type: "string", description: "paid | unpaid | partial" },
    ],
    hint: "Focus on financial figures. Parse line items into structured objects.",
  },
  extractOrder: {
    fields: [
      { name: "orderId", type: "string" },
      { name: "orderDate", type: "string" },
      { name: "storeName", type: "string" },
      { name: "items", type: "array", description: "array of {name, quantity, price}" },
      { name: "subtotal", type: "number" },
      { name: "shippingCost", type: "number" },
      { name: "total", type: "number" },
      { name: "currency", type: "string" },
      { name: "shippingAddress", type: "string" },
      { name: "estimatedDelivery", type: "string" },
      { name: "trackingNumber", type: "string" },
      { name: "orderStatus", type: "string" },
    ],
    hint: "Parse item lists carefully. Extract tracking info if present.",
  },
  extractContact: {
    fields: [
      { name: "firstName", type: "string" },
      { name: "lastName", type: "string" },
      { name: "email", type: "string" },
      { name: "phone", type: "string" },
      { name: "company", type: "string" },
      { name: "jobTitle", type: "string" },
      { name: "website", type: "string" },
      { name: "linkedIn", type: "string" },
      { name: "address", type: "string" },
      { name: "notes", type: "string" },
    ],
    hint: "Extract from email signature if no explicit contact card exists.",
  },
  extractMeeting: {
    fields: [
      { name: "meetingTitle", type: "string" },
      { name: "date", type: "string" },
      { name: "time", type: "string" },
      { name: "duration", type: "string" },
      { name: "timezone", type: "string" },
      { name: "location", type: "string" },
      { name: "meetingLink", type: "string" },
      { name: "organizer", type: "string" },
      { name: "attendees", type: "array" },
      { name: "agenda", type: "string" },
    ],
    hint: "Extract calendar info and Zoom/Meet/Teams link if present.",
  },
};

function stripHtml(html) {
  if (!html || typeof html !== "string") return html || "";
  try {
    let text = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/(<([^>]+)>)/gi, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return text;
  } catch {
    return html;
  }
}

function parseCustomFields(raw) {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return raw.split(",").map((f) => ({ name: f.trim(), type: "string" }));
  }
  return Array.isArray(raw) ? raw : [];
}

export default {
  async run(config, input, context = {}) {
    const {
      operation = "extractInvoice",
      provider = "openai",
      model = "gpt-4o-mini",
    } = config;

    const emailText = config.emailText ?? input?.body ?? input?.text ?? (typeof input === "string" ? input : "");
    const emailSubject = config.emailSubject ?? input?.subject ?? "";
    const emailFrom = config.emailFrom ?? input?.from ?? "";

    if (!emailText) return { success: false, error: "Email Parser: 'emailText' is required — configure this field.", skipped: true };

    const cred = await resolveCredential(config.credentialId, context.workspaceId, "Email Parser");
    const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

    let fields;
    let hint = "";
    if (operation === "extractCustom") {
      fields = parseCustomFields(config.customSchema);
      if (fields.length === 0) return { success: false, error: "Email Parser: 'customSchema' is required for extractCustom operation — configure this field.", skipped: true };
    } else {
      const schema = SCHEMAS[operation];
      if (!schema) throw new Error(`Email Parser: unknown operation "${operation}"`);
      fields = schema.fields;
      hint = schema.hint;
    }

    const cleanText = stripHtml(emailText).slice(0, 8000);
    const fieldDesc = fields.map((f) => {
      const parts = [`"${f.name}" (${f.type ?? "string"})`];
      if (f.description) parts.push(`— ${f.description}`);
      return parts.join(" ");
    }).join("\n");

    const jsonSchema = fields.reduce((acc, f) => {
      acc[f.name] = f.type === "number" ? { type: "number" } :
        f.type === "boolean" ? { type: "boolean" } :
        f.type === "array" ? { type: "array" } :
        { type: "string" };
      return acc;
    }, {});

    const contextParts = [];
    if (emailSubject) contextParts.push(`Subject: ${emailSubject}`);
    if (emailFrom) contextParts.push(`From: ${emailFrom}`);
    const contextBlock = contextParts.length ? contextParts.join("\n") + "\n\n" : "";

    const systemPrompt = `Extract the following fields from the email content. Return valid JSON only matching this schema: ${JSON.stringify(jsonSchema)}

Fields to extract:
${fieldDesc}

${hint ? `Note: ${hint}\n` : ""}Use null for any field not found. Do not guess — only extract what is clearly present.`;

    const userContent = `${contextBlock}Email Body:\n${cleanText}`;

    let extracted;

    if (provider === "anthropic") {
      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: model || "claude-3-haiku-20240307",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        },
        {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          timeout: 120000,
        },
      );
      const raw = response.data.content[0].text;
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Email Parser: Model returned no JSON.");
      try { extracted = JSON.parse(match[0]); } catch { throw new Error(`Email Parser: Invalid JSON from model: ${raw.slice(0, 200)}`); }
    } else {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          temperature: 0,
          response_format: { type: "json_object" },
          max_tokens: 1000,
        },
        { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
      );
      const raw = response.data.choices[0].message.content;
      try { extracted = JSON.parse(raw); } catch { throw new Error(`Email Parser: Invalid JSON from model: ${raw.slice(0, 200)}`); }
    }

    const foundCount = Object.values(extracted).filter((v) => v !== null && v !== undefined).length;
    return {
      ...extracted,
      _meta: {
        operation,
        fieldsRequested: fields.length,
        fieldsFound: foundCount,
        model,
        provider,
        inputLength: cleanText.length,
      },
    };
  },
};
