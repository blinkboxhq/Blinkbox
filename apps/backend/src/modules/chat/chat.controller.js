import "../../config/env.js";
import Anthropic from "@anthropic-ai/sdk";
import { randomBytes } from "crypto";
const nanoid = (n = 12) => randomBytes(n).toString("base64url").slice(0, n);

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory session store (sessionId → messages[])
// Capped at 50 messages per session; sessions older than 2h are auto-evicted
const sessions = new Map();
const sessionMeta = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [id, ts] of sessionMeta) {
    if (now - ts > 7200000) { sessions.delete(id); sessionMeta.delete(id); }
  }
}, 300000);

const SYSTEM = `You are a powerful AI assistant with full file capabilities. You can:
- Answer any question, write code, analyse data, summarise documents
- Read and understand uploaded files: images, PDFs, code, CSV, JSON, text, etc.
- Create files and send them back to the user — use the create_file tool whenever you produce a document, spreadsheet, script, or any other file

Rules:
- When you write code that the user might want to run, offer to create a downloadable file with it
- When creating a CSV or JSON dataset, always use create_file to return it
- Be direct and helpful. Never refuse file requests that are benign.
- Format responses with markdown for readability`;

const CREATE_FILE_TOOL = {
  name: "create_file",
  description: "Create a file and send it to the user as a download. Use this whenever producing code, documents, CSV/JSON data, reports, or any file the user would want to save.",
  input_schema: {
    type: "object",
    properties: {
      filename: {
        type: "string",
        description: "Filename with extension, e.g. report.csv, script.py, data.json, notes.md",
      },
      content: {
        type: "string",
        description: "Full file content as a plain string",
      },
      mimeType: {
        type: "string",
        description: "MIME type: text/plain, text/csv, application/json, text/x-python, text/javascript, text/html, text/markdown, application/xml, etc.",
      },
    },
    required: ["filename", "content", "mimeType"],
    additionalProperties: false,
  },
};

function buildUserContent(message, attachments) {
  const content = [];

  for (const att of attachments) {
    const { name, type, data } = att;

    if (type.startsWith("image/")) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: type, data },
      });
      content.push({ type: "text", text: `[Image: ${name}]` });
    } else if (type === "application/pdf") {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data },
      });
      content.push({ type: "text", text: `[PDF: ${name}]` });
    } else {
      const text = Buffer.from(data, "base64").toString("utf-8").slice(0, 120000);
      content.push({
        type: "text",
        text: `[File: ${name} (${type})]\n\`\`\`\n${text}\n\`\`\``,
      });
    }
  }

  if (message) content.push({ type: "text", text: message });
  return content;
}

async function runWithTools(messages) {
  const createdFiles = [];
  let textReply = "";

  const callAPI = (msgs) =>
    client.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 8096,
        system: SYSTEM,
        messages: msgs,
        tools: [CREATE_FILE_TOOL],
      },
      { headers: { "anthropic-beta": "pdfs-2024-09-25" } },
    );

  let response = await callAPI(messages);

  while (response.stop_reason === "tool_use") {
    const toolBlocks = response.content.filter((b) => b.type === "tool_use");
    const toolResults = [];

    for (const block of toolBlocks) {
      if (block.name === "create_file") {
        const { filename, content, mimeType } = block.input;
        createdFiles.push({ filename, content, mimeType });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `File "${filename}" created and will be delivered to the user.`,
        });
      }
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
    response = await callAPI(messages);
  }

  textReply = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  messages.push({ role: "assistant", content: response.content });

  return { textReply, createdFiles };
}

export async function chatMessage(req, res) {
  try {
    const { message = "", attachments = [], sessionId: clientSessionId } = req.body;

    if (!message.trim() && !attachments.length) {
      return res.status(400).json({ error: "Message or attachment required" });
    }

    const sessionId = clientSessionId || nanoid(12);
    if (!sessions.has(sessionId)) sessions.set(sessionId, []);
    sessionMeta.set(sessionId, Date.now());

    const history = sessions.get(sessionId);
    const userContent = buildUserContent(message, attachments);
    history.push({ role: "user", content: userContent });

    if (history.length > 60) history.splice(0, history.length - 60);

    const { textReply, createdFiles } = await runWithTools(history);

    res.json({ text: textReply, files: createdFiles, sessionId });
  } catch (err) {
    console.error("[Chat]", err.message);
    res.status(500).json({ error: err.message || "Chat failed" });
  }
}

export function clearSession(req, res) {
  const { sessionId } = req.body;
  if (sessionId) { sessions.delete(sessionId); sessionMeta.delete(sessionId); }
  res.json({ ok: true });
}
