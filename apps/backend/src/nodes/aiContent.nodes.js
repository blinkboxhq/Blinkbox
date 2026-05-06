import axios from "axios";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";

async function getKey(credentialId, workspaceId, type) {
  const cred = await resolveCredential(credentialId, workspaceId, type);
  return decrypt(cred.encryptedData, cred.iv, cred.authTag);
}

async function chatCompletion(apiKey, system, user, model = "gpt-4o-mini", maxTokens = 2000) {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    { model, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: maxTokens, temperature: 0.7 },
    { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 120000 },
  );
  return res.data.choices?.[0]?.message?.content || "";
}

// ── image_caption ─────────────────────────────────────────────────────────────
export const image_caption = {
  async run(config, input, context) {
    const imageUrl = config.imageUrl || input?.imageUrl || input?.url;
    if (!imageUrl) return { success: false, error: "image_caption: 'imageUrl' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("image_caption: OpenAI credential required.");

    const prompt = config.prompt || "Describe this image in detail. Include objects, people, text, colors, and mood.";
    const res = await axios.post("https://api.openai.com/v1/chat/completions",
      { model: "gpt-4o", messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrl, detail: "auto" } }] }], max_tokens: 1000 },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 120000 },
    );
    const caption = res.data.choices?.[0]?.message?.content || "";
    return { caption, imageUrl, tokensUsed: res.data.usage?.total_tokens };
  },
};

// ── image_generate ────────────────────────────────────────────────────────────
export const image_generate = {
  async run(config, input, context) {
    const prompt = config.prompt || config.imagePrompt || input?.prompt;
    if (!prompt) return { success: false, error: "image_generate: 'prompt' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("image_generate: OpenAI credential required.");

    const res = await axios.post("https://api.openai.com/v1/images/generations",
      { model: config.model || "dall-e-3", prompt, n: 1, size: config.size || "1024x1024", quality: config.quality || "standard", response_format: "url" },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 120000 },
    );
    const img = res.data.data?.[0];
    return { imageUrl: img?.url, revisedPrompt: img?.revised_prompt, prompt };
  },
};

// ── grammar_check ─────────────────────────────────────────────────────────────
export const grammar_check = {
  async run(config, input, context) {
    const text = config.text || input?.text || String(input || "");
    if (!text) return { success: false, error: "grammar_check: 'text' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("grammar_check: OpenAI credential required.");

    const result = await chatCompletion(apiKey,
      "You are a grammar checker. Correct grammar, spelling, punctuation. Return JSON: { corrected, changes: [{original, fixed, type}], errorCount, score }",
      `Check and correct: "${text}"`, "gpt-4o-mini", 1500,
    );
    try { return { ...JSON.parse(result), original: text }; } catch { return { corrected: result, original: text }; }
  },
};

// ── blog_post ─────────────────────────────────────────────────────────────────
export const blog_post = {
  async run(config, input, context) {
    const topic = config.topic || config.prompt || input?.topic || input?.text;
    if (!topic) return { success: false, error: "blog_post: 'topic' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("blog_post: OpenAI credential required.");

    const tone = config.tone || "professional";
    const length = config.length || "medium";
    const wordCounts = { short: 300, medium: 700, long: 1500 };
    const words = wordCounts[length] || 700;

    const content = await chatCompletion(apiKey,
      `You are an expert blog writer. Write in a ${tone} tone. Include a title, introduction, 3-5 sections with headers, and conclusion.`,
      `Write a ${words}-word blog post about: ${topic}`, config.model || "gpt-4o-mini", 2500,
    );
    const titleMatch = content.match(/^#\s+(.+)|^Title:\s*(.+)/m);
    return { content, title: titleMatch?.[1] || titleMatch?.[2] || topic, wordCount: content.split(/\s+/).length, topic, tone, length };
  },
};

// ── caption_writer ────────────────────────────────────────────────────────────
export const caption_writer = {
  async run(config, input, context) {
    const topic = config.topic || config.prompt || input?.topic || input?.text;
    if (!topic) return { success: false, error: "caption_writer: 'topic' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("caption_writer: OpenAI credential required.");

    const platform = config.platform || "instagram";
    const tone = config.tone || "engaging";
    const result = await chatCompletion(apiKey,
      `You are a social media expert. Write captions optimized for ${platform}. Return JSON: { caption, hashtags: [], callToAction }`,
      `Write a ${tone} caption for ${platform} about: ${topic}`, "gpt-4o-mini", 800,
    );
    try { return { ...JSON.parse(result), platform, topic }; } catch { return { caption: result, platform, topic }; }
  },
};

// ── flashcard_generator ───────────────────────────────────────────────────────
export const flashcard_generator = {
  async run(config, input, context) {
    const topic = config.topic || config.text || input?.topic || input?.text;
    if (!topic) return { success: false, error: "flashcard_generator: 'topic' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("flashcard_generator: OpenAI credential required.");

    const count = parseInt(config.count || 10);
    const result = await chatCompletion(apiKey,
      `Generate flashcards as JSON array: [{"front": "question", "back": "answer", "difficulty": "easy|medium|hard"}]`,
      `Create ${count} flashcards about: ${topic}`, "gpt-4o-mini", 2000,
    );
    try {
      const cards = JSON.parse(result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim());
      return { flashcards: cards, count: cards.length, topic };
    } catch { return { raw: result, topic }; }
  },
};

// ── quiz_generator ────────────────────────────────────────────────────────────
export const quiz_generator = {
  async run(config, input, context) {
    const topic = config.topic || config.text || input?.topic || input?.text;
    if (!topic) return { success: false, error: "quiz_generator: 'topic' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("quiz_generator: OpenAI credential required.");

    const count = parseInt(config.count || 5);
    const difficulty = config.difficulty || "medium";
    const result = await chatCompletion(apiKey,
      `Generate a quiz as JSON: [{"question":"...","options":["A","B","C","D"],"answer":"A","explanation":"..."}]`,
      `Create ${count} ${difficulty} multiple-choice questions about: ${topic}`, "gpt-4o-mini", 2500,
    );
    try {
      const questions = JSON.parse(result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim());
      return { questions, count: questions.length, topic, difficulty };
    } catch { return { raw: result, topic }; }
  },
};

// ── hashtag_suggester ─────────────────────────────────────────────────────────
export const hashtag_suggester = {
  async run(config, input, context) {
    const topic = config.topic || config.text || input?.topic || input?.text;
    if (!topic) return { success: false, error: "hashtag_suggester: 'topic' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("hashtag_suggester: OpenAI credential required.");

    const platform = config.platform || "instagram";
    const count = parseInt(config.count || 20);
    const result = await chatCompletion(apiKey,
      `You are a social media expert. Return JSON: {"hashtags":["#tag1","#tag2"],"popular":["#tag"],"niche":["#tag"],"branded":["#tag"]}`,
      `Generate ${count} relevant ${platform} hashtags for: ${topic}`, "gpt-4o-mini", 800,
    );
    try { return { ...JSON.parse(result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim()), topic, platform }; }
    catch { return { hashtags: result.match(/#\w+/g) || [], topic, platform }; }
  },
};

// ── citation_formatter ────────────────────────────────────────────────────────
export const citation_formatter = {
  async run(config, input, context) {
    const source = config.source || input?.source || input?.text;
    if (!source) return { success: false, error: "citation_formatter: 'source' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("citation_formatter: OpenAI credential required.");

    const style = config.style || "APA";
    const result = await chatCompletion(apiKey,
      `Format citations in ${style} style. Return JSON: {"formatted":"...","style":"${style}","type":"article|book|website|..."}`,
      `Format this citation in ${style}: ${JSON.stringify(source)}`, "gpt-4o-mini", 500,
    );
    try { return JSON.parse(result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim()); }
    catch { return { formatted: result, style }; }
  },
};

// ── summarize ─────────────────────────────────────────────────────────────────
export const summarize = {
  async run(config, input, context) {
    const text = config.text || input?.text || input?.content || (typeof input === "string" ? input : JSON.stringify(input));
    if (!text) return { success: false, error: "summarize: 'text' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("summarize: OpenAI credential required.");

    const length = config.length || "medium";
    const style = config.style || "paragraph";
    const instructions = { short: "2-3 sentences", medium: "1 paragraph", long: "2-3 paragraphs" };

    const result = await chatCompletion(apiKey,
      `Summarize the text in ${instructions[length] || "1 paragraph"} as ${style === "bullets" ? "bullet points" : "flowing prose"}.`,
      text.substring(0, 30000), config.model || "gpt-4o-mini", 1000,
    );
    return { summary: result, wordCount: result.split(/\s+/).length, originalLength: text.length, length, style };
  },
};

// ── remove_background ─────────────────────────────────────────────────────────
export const remove_background = {
  async run(config, input, context) {
    const imageUrl = config.imageUrl || config.url || input?.imageUrl || input?.url;
    if (!imageUrl) return { success: false, error: "remove_background: 'imageUrl' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "RemoveBg"));
    if (!apiKey) throw new Error("remove_background: remove.bg API key required.");

    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("image_url", imageUrl);
    form.append("size", config.size || "auto");

    const res = await axios.post("https://api.remove.bg/v1.0/removebg", form, {
      headers: { "X-Api-Key": apiKey, ...form.getHeaders() },
      responseType: "arraybuffer",
      timeout: 60000,
    });
    const base64 = Buffer.from(res.data).toString("base64");
    return { result: `data:image/png;base64,${base64}`, format: "png", originalUrl: imageUrl };
  },
};

// ── invoice_parser ────────────────────────────────────────────────────────────
export const invoice_parser = {
  async run(config, input, context) {
    const text = config.text || input?.text || input?.content || JSON.stringify(input);
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("invoice_parser: OpenAI credential required.");

    const result = await chatCompletion(apiKey,
      `Extract invoice data as JSON: {invoiceNumber, date, dueDate, vendor:{name,address,email}, customer:{name,address}, lineItems:[{description,quantity,unitPrice,total}], subtotal, tax, total, currency, paymentTerms}. Return only JSON.`,
      `Parse this invoice:\n${text.substring(0, 10000)}`, "gpt-4o-mini", 2000,
    );
    try { return JSON.parse(result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim()); }
    catch { return { raw: result }; }
  },
};

// ── bank_statement_parser ─────────────────────────────────────────────────────
export const bank_statement_parser = {
  async run(config, input, context) {
    const text = config.text || input?.text || input?.content || JSON.stringify(input);
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("bank_statement_parser: OpenAI credential required.");

    const result = await chatCompletion(apiKey,
      `Extract bank statement data as JSON: {accountNumber, bankName, period:{from,to}, openingBalance, closingBalance, currency, transactions:[{date,description,debit,credit,balance,category}], summary:{totalDebit,totalCredit,transactionCount}}. Return only JSON.`,
      `Parse this bank statement:\n${text.substring(0, 15000)}`, "gpt-4o-mini", 3000,
    );
    try { return JSON.parse(result.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim()); }
    catch { return { raw: result }; }
  },
};

// ── audience_insights ─────────────────────────────────────────────────────────
export const audience_insights = {
  async run(config, input, context) {
    const platform = config.platform || input?.platform || "instagram";
    const metrics = config.metrics || input?.metrics || input;
    const apiKey = config.aiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));

    if (!apiKey) {
      return { platform, metrics, summary: "Enable AI summary by providing an OpenAI credential.", aiSummary: false };
    }

    const summary = await chatCompletion(apiKey,
      `You are a social media analytics expert. Analyze the metrics and provide actionable insights.`,
      `Platform: ${platform}\nMetrics: ${JSON.stringify(metrics, null, 2)}\n\nProvide: 1) Key insights 2) What's working 3) What to improve 4) Recommendations`,
      "gpt-4o-mini", 1000,
    );
    return { platform, metrics, aiSummary: summary, period: config.period || "28d" };
  },
};

// ── chat ──────────────────────────────────────────────────────────────────────
export const chat = {
  async run(config, input, context) {
    const message = config.message || config.prompt || input?.message || input?.text;
    if (!message) return { success: false, error: "chat: 'message' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("chat: OpenAI credential required.");

    const messages = [
      ...(config.systemPrompt ? [{ role: "system", content: config.systemPrompt }] : [{ role: "system", content: "You are a helpful assistant." }]),
      ...(Array.isArray(input?.history) ? input.history : []),
      { role: "user", content: message },
    ];

    const res = await axios.post("https://api.openai.com/v1/chat/completions",
      { model: config.model || "gpt-4o-mini", messages, max_tokens: parseInt(config.maxTokens || 1000), temperature: parseFloat(config.temperature || 0.7) },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 60000 },
    );
    const reply = res.data.choices?.[0]?.message?.content || "";
    return {
      reply, message,
      history: [...messages, { role: "assistant", content: reply }],
      tokensUsed: res.data.usage?.total_tokens,
    };
  },
};

// ── thumbnail_generator ───────────────────────────────────────────────────────
export const thumbnail_generator = {
  async run(config, input, context) {
    const title = config.title || config.topic || input?.title || input?.topic;
    if (!title) return { success: false, error: "thumbnail_generator: 'title' is required.", skipped: true };
    const apiKey = config.apiKey || (config.credentialId && await getKey(config.credentialId, context?.workspaceId, "OpenAI"));
    if (!apiKey) throw new Error("thumbnail_generator: OpenAI credential required.");

    const style = config.style || "professional YouTube thumbnail";
    const prompt = `${style}: "${title}". Bold text overlay, eye-catching colors, high contrast, clean composition. Professional quality.`;
    const res = await axios.post("https://api.openai.com/v1/images/generations",
      { model: "dall-e-3", prompt, n: 1, size: "1792x1024", quality: "standard", response_format: "url" },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 120000 },
    );
    const img = res.data.data?.[0];
    return { imageUrl: img?.url, revisedPrompt: img?.revised_prompt, title, style };
  },
};
