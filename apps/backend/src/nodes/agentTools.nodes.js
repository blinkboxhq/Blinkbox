/**
 * AGENT TOOL NODES — Backend Implementations
 *
 * Each export follows the cursor.executor.js tool pattern:
 *   { toolDefinition: { name, description, parameters }, run(config, args, ctx) }
 *
 * The executor at lines 258-268 of cursor.executor.js:
 *   const toolHandler = nodeRegistry[toolType]
 *   if (toolHandler?.toolDefinition) -> wraps into LLM-callable tool
 *   else -> calls toolHandler.run() directly
 */

import axios from "axios";
import crypto from "crypto";
import { execute as containerExecute, executeCustom as containerExecuteCustom } from "../infra/container.pool.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";

function assertSafeUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { throw new Error(`Invalid URL: "${rawUrl}"`); }
  const h = parsed.hostname.toLowerCase();
  const blocked = [
    /^localhost$/, /^127\./, /^0\.0\.0\.0$/, /^::1$/,
    /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
    /^169\.254\./,
    /^fc00:/i, /^fe80:/i, /^fd[0-9a-f]{2}:/i, /^0\b/,
  ];
  if (blocked.some((re) => re.test(h)))
    throw new Error(`Requests to internal addresses are not allowed (${h})`);
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error(`Only http/https protocols are allowed`);
}

const execAsync = promisify(exec);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function td(name, description, properties = {}, required = []) {
  return {
    name,
    description,
    parameters: { type: "object", properties, required },
  };
}

async function safeExec(cmd, timeoutMs = 10000) {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 4,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (err) {
    return { stdout: "", stderr: err.message, exitCode: err.code };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH & INFORMATION
// ─────────────────────────────────────────────────────────────────────────────

export const tool_tavily = {
  toolDefinition: td(
    "tool_tavily",
    "Search the web using Tavily AI search API for real-time information",
    {
      query: { type: "string", description: "Search query" },
      max_results: { type: "number", description: "Number of results (default 5)" },
    },
    ["query"]
  ),
  async run(config, args, ctx) {
    const apiKey = config.apiKey || process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error("[tool_tavily] No API key configured");
    const resp = await axios.post(
      "https://api.tavily.com/search",
      { query: args.query, max_results: args.max_results || 5 },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 15000 }
    );
    return resp.data;
  },
};

export const tool_google_search = {
  toolDefinition: td(
    "tool_google_search",
    "Search Google via Custom Search API",
    {
      query: { type: "string", description: "Search query" },
      num: { type: "number", description: "Number of results (1-10)" },
    },
    ["query"]
  ),
  async run(config, args) {
    const key = config.apiKey || process.env.GOOGLE_SEARCH_API_KEY;
    const cx = config.searchEngineId || process.env.GOOGLE_SEARCH_ENGINE_ID;
    if (!key || !cx) throw new Error("[tool_google_search] API key and Search Engine ID required");
    const resp = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: { key, cx, q: args.query, num: Math.min(args.num || 5, 10) },
      timeout: 10000,
    });
    return {
      results: resp.data.items?.map((i) => ({
        title: i.title,
        link: i.link,
        snippet: i.snippet,
      })) || [],
    };
  },
};

export const tool_bing_search = {
  toolDefinition: td(
    "tool_bing_search",
    "Search the web using Bing Search API",
    {
      query: { type: "string", description: "Search query" },
      count: { type: "number", description: "Number of results" },
    },
    ["query"]
  ),
  async run(config, args) {
    const key = config.apiKey || process.env.BING_SEARCH_API_KEY;
    if (!key) throw new Error("[tool_bing_search] Bing API key required");
    const resp = await axios.get("https://api.bing.microsoft.com/v7.0/search", {
      headers: { "Ocp-Apim-Subscription-Key": key },
      params: { q: args.query, count: args.count || 5 },
      timeout: 10000,
    });
    return {
      results: resp.data.webPages?.value?.map((r) => ({
        title: r.name,
        url: r.url,
        snippet: r.snippet,
      })) || [],
    };
  },
};

export const tool_brave_search = {
  toolDefinition: td(
    "tool_brave_search",
    "Search the web using Brave Search API (privacy-focused)",
    { query: { type: "string", description: "Search query" } },
    ["query"]
  ),
  async run(config, args) {
    const key = config.apiKey || process.env.BRAVE_SEARCH_API_KEY;
    if (!key) throw new Error("[tool_brave_search] Brave API key required");
    const resp = await axios.get("https://api.search.brave.com/res/v1/web/search", {
      headers: { "Accept": "application/json", "X-Subscription-Token": key },
      params: { q: args.query },
      timeout: 10000,
    });
    return {
      results: resp.data.web?.results?.map((r) => ({
        title: r.title,
        url: r.url,
        description: r.description,
      })) || [],
    };
  },
};

export const tool_duckduckgo = {
  toolDefinition: td(
    "tool_duckduckgo",
    "Search the web using DuckDuckGo (no API key needed)",
    { query: { type: "string", description: "Search query" } },
    ["query"]
  ),
  async run(config, args) {
    const q = encodeURIComponent(args.query);
    const resp = await axios.get(`https://api.duckduckgo.com/?q=${q}&format=json&no_redirect=1`, {
      timeout: 10000,
    });
    const data = resp.data;
    return {
      abstract: data.Abstract || "",
      abstractURL: data.AbstractURL || "",
      relatedTopics: data.RelatedTopics?.slice(0, 5).map((t) => t.Text || t.Name) || [],
    };
  },
};

export const tool_exa = {
  toolDefinition: td(
    "tool_exa",
    "Semantic web search using Exa (neural search engine)",
    {
      query: { type: "string", description: "Search query" },
      numResults: { type: "number", description: "Number of results" },
    },
    ["query"]
  ),
  async run(config, args) {
    const key = config.apiKey || process.env.EXA_API_KEY;
    if (!key) throw new Error("[tool_exa] Exa API key required");
    const resp = await axios.post(
      "https://api.exa.ai/search",
      { query: args.query, numResults: args.numResults || 5 },
      { headers: { "x-api-key": key, "Content-Type": "application/json" }, timeout: 15000 }
    );
    return resp.data;
  },
};

export const tool_searxng = {
  toolDefinition: td(
    "tool_searxng",
    "Search using a self-hosted SearXNG instance",
    {
      query: { type: "string", description: "Search query" },
      categories: { type: "string", description: "Search categories (e.g. general,news)" },
    },
    ["query"]
  ),
  async run(config, args) {
    const baseUrl = config.searxngUrl || process.env.SEARXNG_URL || "https://searx.be";
    const resp = await axios.get(`${baseUrl}/search`, {
      params: { q: args.query, categories: args.categories || "general", format: "json" },
      timeout: 10000,
    });
    return {
      results: resp.data.results?.slice(0, 8).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
      })) || [],
    };
  },
};

export const tool_news = {
  toolDefinition: td(
    "tool_news",
    "Fetch latest news articles by topic using NewsAPI",
    {
      query: { type: "string", description: "Topic or keyword" },
      language: { type: "string", description: "Language code (en, es, fr...)" },
    },
    ["query"]
  ),
  async run(config, args) {
    const key = config.apiKey || process.env.NEWS_API_KEY;
    if (!key) throw new Error("[tool_news] NewsAPI key required");
    const resp = await axios.get("https://newsapi.org/v2/everything", {
      params: { q: args.query, language: args.language || "en", pageSize: 5, apiKey: key },
      timeout: 10000,
    });
    return {
      articles: resp.data.articles?.map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source?.name,
        publishedAt: a.publishedAt,
        description: a.description,
      })) || [],
    };
  },
};

export const tool_arxiv = {
  toolDefinition: td(
    "tool_arxiv",
    "Search academic papers on arXiv",
    {
      query: { type: "string", description: "Research query or paper topic" },
      maxResults: { type: "number", description: "Max results (default 5)" },
    },
    ["query"]
  ),
  async run(config, args) {
    const q = encodeURIComponent(args.query);
    const max = args.maxResults || 5;
    const resp = await axios.get(
      `https://export.arxiv.org/api/query?search_query=all:${q}&start=0&max_results=${max}`,
      { timeout: 15000 }
    );
    const entries = resp.data.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
    return {
      papers: entries.map((e) => ({
        title: (e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim(),
        summary: (e.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.trim().slice(0, 300),
        id: (e.match(/<id>([\s\S]*?)<\/id>/) || [])[1]?.trim(),
      })),
    };
  },
};

export const tool_wolfram = {
  toolDefinition: td(
    "tool_wolfram",
    "Query Wolfram Alpha for computation, math, and factual knowledge",
    { query: { type: "string", description: "Question or computation" } },
    ["query"]
  ),
  async run(config, args) {
    const appId = config.appId || process.env.WOLFRAM_APP_ID;
    if (!appId) throw new Error("[tool_wolfram] Wolfram Alpha App ID required");
    const resp = await axios.get("https://api.wolframalpha.com/v1/result", {
      params: { appid: appId, i: args.query },
      timeout: 15000,
    });
    return { result: resp.data };
  },
};

export const tool_stock = {
  toolDefinition: td(
    "tool_stock",
    "Get stock price and market data",
    {
      symbol: { type: "string", description: "Ticker symbol (e.g. AAPL, TSLA)" },
    },
    ["symbol"]
  ),
  async run(config, args) {
    const key = config.apiKey || process.env.ALPHAVANTAGE_API_KEY || "demo";
    const resp = await axios.get("https://www.alphavantage.co/query", {
      params: { function: "GLOBAL_QUOTE", symbol: args.symbol.toUpperCase(), apikey: key },
      timeout: 10000,
    });
    return resp.data["Global Quote"] || resp.data;
  },
};

export const tool_currency = {
  toolDefinition: td(
    "tool_currency",
    "Convert currency amounts between different currencies",
    {
      amount: { type: "number", description: "Amount to convert" },
      from: { type: "string", description: "Source currency code (USD, EUR...)" },
      to: { type: "string", description: "Target currency code" },
    },
    ["amount", "from", "to"]
  ),
  async run(config, args) {
    const from = args.from.toUpperCase();
    const to = args.to.toUpperCase();
    const resp = await axios.get(`https://open.er-api.com/v6/latest/${from}`, { timeout: 8000 });
    const rate = resp.data?.rates?.[to];
    if (!rate) throw new Error(`[tool_currency] No rate found for ${from} → ${to}`);
    return {
      from,
      to,
      amount: args.amount,
      converted: parseFloat((args.amount * rate).toFixed(6)),
      rate,
    };
  },
};

export const tool_exchange_rate = {
  toolDefinition: td(
    "tool_exchange_rate",
    "Get live exchange rates for a base currency",
    { base: { type: "string", description: "Base currency code (e.g. USD)" } },
    ["base"]
  ),
  async run(config, args) {
    const resp = await axios.get(
      `https://open.er-api.com/v6/latest/${args.base.toUpperCase()}`,
      { timeout: 8000 }
    );
    return resp.data;
  },
};

export const tool_weather = {
  toolDefinition: td(
    "tool_weather",
    "Get current weather and forecast for a location",
    {
      location: { type: "string", description: "City name or coordinates" },
      units: { type: "string", description: "metric or imperial" },
    },
    ["location"]
  ),
  async run(config, args) {
    const key = config.apiKey || process.env.OPENWEATHER_API_KEY;
    if (!key) throw new Error("[tool_weather] OpenWeatherMap API key required");
    const resp = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
      params: { q: args.location, units: args.units || "metric", appid: key },
      timeout: 8000,
    });
    return {
      city: resp.data.name,
      temp: resp.data.main?.temp,
      feels_like: resp.data.main?.feels_like,
      humidity: resp.data.main?.humidity,
      description: resp.data.weather?.[0]?.description,
      wind_speed: resp.data.wind?.speed,
    };
  },
};

export const tool_ip_geo = {
  toolDefinition: td(
    "tool_ip_geo",
    "Look up geolocation for an IP address",
    { ip: { type: "string", description: "IP address to look up" } },
    ["ip"]
  ),
  async run(config, args) {
    const resp = await axios.get(`https://ipapi.co/${args.ip}/json/`, { timeout: 8000 });
    return resp.data;
  },
};

export const tool_dictionary = {
  toolDefinition: td(
    "tool_dictionary",
    "Look up word definitions, synonyms, and pronunciations",
    { word: { type: "string", description: "Word to look up" } },
    ["word"]
  ),
  async run(config, args) {
    const resp = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(args.word)}`,
      { timeout: 8000 }
    );
    const entry = resp.data?.[0];
    return {
      word: entry?.word,
      phonetic: entry?.phonetic,
      meanings: entry?.meanings?.slice(0, 3).map((m) => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions?.slice(0, 2).map((d) => d.definition),
        synonyms: m.synonyms?.slice(0, 5),
      })),
    };
  },
};

export const tool_translate = {
  toolDefinition: td(
    "tool_translate",
    "Translate text to another language using LibreTranslate",
    {
      text: { type: "string", description: "Text to translate" },
      source: { type: "string", description: "Source language code (auto for auto-detect)" },
      target: { type: "string", description: "Target language code (e.g. es, fr, de)" },
    },
    ["text", "target"]
  ),
  async run(config, args) {
    const url = config.libreTranslateUrl || process.env.LIBRETRANSLATE_URL || "https://libretranslate.com";
    const resp = await axios.post(
      `${url}/translate`,
      {
        q: args.text,
        source: args.source || "auto",
        target: args.target,
        api_key: config.apiKey || process.env.LIBRETRANSLATE_API_KEY || "",
      },
      { timeout: 15000 }
    );
    return { translatedText: resp.data.translatedText, detectedLanguage: resp.data.detectedLanguage };
  },
};

export const tool_timezone = {
  toolDefinition: td(
    "tool_timezone",
    "Convert time between timezones and get current time anywhere",
    {
      timezone: { type: "string", description: "IANA timezone (e.g. America/New_York)" },
      time: { type: "string", description: "ISO time string to convert (optional, defaults to now)" },
    },
    ["timezone"]
  ),
  async run(config, args) {
    const d = args.time ? new Date(args.time) : new Date();
    const formatted = d.toLocaleString("en-US", { timeZone: args.timezone, dateStyle: "full", timeStyle: "long" });
    return { timezone: args.timezone, time: formatted, iso: d.toISOString(), unixMs: d.getTime() };
  },
};

export const tool_unit_convert = {
  toolDefinition: td(
    "tool_unit_convert",
    "Convert values between units (length, weight, temperature, etc.)",
    {
      value: { type: "number", description: "Value to convert" },
      from: { type: "string", description: "Source unit (e.g. km, lb, celsius)" },
      to: { type: "string", description: "Target unit (e.g. miles, kg, fahrenheit)" },
    },
    ["value", "from", "to"]
  ),
  async run(config, args) {
    const conversions = {
      km_miles: 0.621371, miles_km: 1.60934, kg_lb: 2.20462, lb_kg: 0.453592,
      m_ft: 3.28084, ft_m: 0.3048, l_gal: 0.264172, gal_l: 3.78541,
      celsius_fahrenheit: (v) => (v * 9) / 5 + 32,
      fahrenheit_celsius: (v) => ((v - 32) * 5) / 9,
      celsius_kelvin: (v) => v + 273.15,
      kelvin_celsius: (v) => v - 273.15,
      m_cm: 100, cm_m: 0.01, km_m: 1000, m_km: 0.001,
    };
    const key = `${args.from.toLowerCase()}_${args.to.toLowerCase()}`;
    const conv = conversions[key];
    if (!conv) return { error: `No converter for ${args.from} → ${args.to}`, value: args.value };
    const result = typeof conv === "function" ? conv(args.value) : args.value * conv;
    return { from: args.from, to: args.to, input: args.value, output: parseFloat(result.toFixed(6)) };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// WEB & HTTP
// ─────────────────────────────────────────────────────────────────────────────

export const tool_http_request = {
  toolDefinition: td(
    "tool_http_request",
    "Make any HTTP/HTTPS request to an external API or URL",
    {
      url: { type: "string", description: "Request URL" },
      method: { type: "string", description: "HTTP method (GET, POST, PUT, DELETE, PATCH)" },
      headers: { type: "object", description: "Request headers as key-value pairs" },
      body: { type: "object", description: "Request body (for POST/PUT/PATCH)" },
      params: { type: "object", description: "URL query parameters" },
    },
    ["url"]
  ),
  async run(config, args) {
    const resp = await axios({
      method: args.method || "GET",
      url: args.url,
      headers: args.headers || {},
      params: args.params,
      data: args.body,
      timeout: 30000,
    });
    return { status: resp.status, headers: resp.headers, data: resp.data };
  },
};

export const tool_scraper = {
  toolDefinition: td(
    "tool_scraper",
    "Scrape text content from a web page URL",
    {
      url: { type: "string", description: "URL to scrape" },
      selector: { type: "string", description: "CSS selector to extract specific content" },
    },
    ["url"]
  ),
  async run(config, args) {
    const resp = await axios.get(args.url, {
      timeout: 20000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Blinkbox/1.0)" },
    });
    let html = resp.data;
    // Strip tags and scripts naively for text extraction
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
    return { url: args.url, text, length: text.length };
  },
};

export const tool_screenshot = {
  toolDefinition: td(
    "tool_screenshot",
    "Take a screenshot of a webpage and get the image as base64",
    {
      url: { type: "string", description: "URL to screenshot" },
      fullPage: { type: "boolean", description: "Capture full page (default false)" },
    },
    ["url"]
  ),
  async run(config, args) {
    let puppeteer;
    try {
      puppeteer = (await import("puppeteer")).default;
    } catch {
      throw new Error("[tool_screenshot] Puppeteer not available");
    }
    assertSafeUrl(args.url);
    const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    try {
      const page = await browser.newPage();
      await page.goto(args.url, { waitUntil: "networkidle2", timeout: 30000 });
      const screenshot = await page.screenshot({ encoding: "base64", fullPage: !!args.fullPage });
      return { url: args.url, screenshot: `data:image/png;base64,${screenshot}` };
    } finally {
      await browser.close();
    }
  },
};

export const tool_ssl_check = {
  toolDefinition: td(
    "tool_ssl_check",
    "Check SSL certificate validity and expiry for a domain",
    { hostname: { type: "string", description: "Domain name to check" } },
    ["hostname"]
  ),
  async run(config, args) {
    return new Promise((resolve) => {
      const tls = require("tls");
      const socket = tls.connect({ host: args.hostname, port: 443, servername: args.hostname, rejectUnauthorized: false }, () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();
        resolve({
          hostname: args.hostname,
          valid: socket.authorized,
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysUntilExpiry: Math.floor((new Date(cert.valid_to) - Date.now()) / (1000 * 60 * 60 * 24)),
        });
      });
      socket.on("error", (err) => resolve({ hostname: args.hostname, error: err.message }));
    });
  },
};

export const tool_html_parse = {
  toolDefinition: td(
    "tool_html_parse",
    "Extract structured data from HTML markup",
    {
      html: { type: "string", description: "HTML string to parse" },
      extract: { type: "string", description: "What to extract: text, links, images, headings, or all" },
    },
    ["html"]
  ),
  async run(config, args) {
    const html = args.html;
    const mode = args.extract || "text";
    const result = {};
    if (mode === "text" || mode === "all") {
      result.text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
    if (mode === "links" || mode === "all") {
      result.links = [...html.matchAll(/href=["'](https?:\/\/[^"']+)["']/g)].map((m) => m[1]);
    }
    if (mode === "images" || mode === "all") {
      result.images = [...html.matchAll(/src=["'](https?:\/\/[^"']+\.(png|jpg|jpeg|gif|webp|svg))["']/gi)].map((m) => m[1]);
    }
    if (mode === "headings" || mode === "all") {
      result.headings = [...html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)].map((m) =>
        m[1].replace(/<[^>]+>/g, "").trim()
      );
    }
    return result;
  },
};

export const tool_xml_parse = {
  toolDefinition: td(
    "tool_xml_parse",
    "Parse XML and extract values using simple key path",
    {
      xml: { type: "string", description: "XML string to parse" },
      path: { type: "string", description: "Tag name to extract values from" },
    },
    ["xml"]
  ),
  async run(config, args) {
    const tag = args.path || "";
    const values = tag
      ? [...args.xml.matchAll(new RegExp(`<${tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*>([\\s\\S]*?)<\\/${tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}>`, "g"))].map((m) =>
          m[1].replace(/<[^>]+>/g, "").trim()
        )
      : [];
    return { tag, values, count: values.length };
  },
};

export const tool_form_fill = {
  toolDefinition: td(
    "tool_form_fill",
    "Fill and submit a web form using headless browser automation",
    {
      url: { type: "string", description: "URL of the page with the form" },
      fields: { type: "object", description: "Map of CSS selector to value to fill" },
      submitSelector: { type: "string", description: "CSS selector of submit button" },
    },
    ["url", "fields"]
  ),
  async run(config, args) {
    let puppeteer;
    try {
      puppeteer = (await import("puppeteer")).default;
    } catch {
      throw new Error("[tool_form_fill] Puppeteer not available");
    }
    assertSafeUrl(args.url);
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    try {
      const page = await browser.newPage();
      await page.goto(args.url, { waitUntil: "networkidle2", timeout: 30000 });
      for (const [selector, value] of Object.entries(args.fields || {})) {
        await page.type(selector, String(value));
      }
      if (args.submitSelector) {
        await Promise.all([
          page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
          page.click(args.submitSelector),
        ]);
      }
      return { success: true, finalUrl: page.url() };
    } finally {
      await browser.close();
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMMUNICATION
// ─────────────────────────────────────────────────────────────────────────────

export const tool_email = {
  toolDefinition: td(
    "tool_email",
    "Send an email via SMTP",
    {
      to: { type: "string", description: "Recipient email address" },
      subject: { type: "string", description: "Email subject" },
      body: { type: "string", description: "Email body (HTML or plain text)" },
      from: { type: "string", description: "Sender email address" },
    },
    ["to", "subject", "body"]
  ),
  async run(config, args) {
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      host: config.smtpHost || process.env.SMTP_HOST,
      port: parseInt(config.smtpPort || process.env.SMTP_PORT || "587"),
      secure: config.smtpSecure === "true" || process.env.SMTP_SECURE === "true",
      auth: {
        user: config.smtpUser || process.env.SMTP_USER,
        pass: config.smtpPass || process.env.SMTP_PASS,
      },
    });
    const info = await transporter.sendMail({
      from: args.from || config.smtpUser || process.env.SMTP_USER,
      to: args.to,
      subject: args.subject,
      html: args.body,
    });
    return { messageId: info.messageId, accepted: info.accepted };
  },
};

export const tool_slack = {
  toolDefinition: td(
    "tool_slack",
    "Send a message to a Slack channel via webhook",
    {
      message: { type: "string", description: "Message text to send" },
      channel: { type: "string", description: "Channel name (optional, uses webhook default)" },
    },
    ["message"]
  ),
  async run(config, args) {
    const webhookUrl = config.webhookUrl || process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("[tool_slack] Slack webhook URL required");
    const payload = { text: args.message };
    if (args.channel) payload.channel = args.channel;
    const resp = await axios.post(webhookUrl, payload, { timeout: 8000 });
    return { success: resp.data === "ok", response: resp.data };
  },
};

export const tool_discord = {
  toolDefinition: td(
    "tool_discord",
    "Send a message to a Discord channel via webhook",
    {
      content: { type: "string", description: "Message to send" },
      username: { type: "string", description: "Bot username to display" },
    },
    ["content"]
  ),
  async run(config, args) {
    const webhookUrl = config.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) throw new Error("[tool_discord] Discord webhook URL required");
    const resp = await axios.post(webhookUrl, {
      content: args.content,
      username: args.username || "Blinkbox Agent",
    }, { timeout: 8000 });
    return { success: true, status: resp.status };
  },
};

export const tool_telegram = {
  toolDefinition: td(
    "tool_telegram",
    "Send a Telegram message via Bot API",
    {
      chatId: { type: "string", description: "Telegram chat ID or @username" },
      text: { type: "string", description: "Message text" },
    },
    ["chatId", "text"]
  ),
  async run(config, args) {
    const token = config.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("[tool_telegram] Telegram bot token required");
    const resp = await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      { chat_id: args.chatId, text: args.text, parse_mode: "HTML" },
      { timeout: 8000 }
    );
    return resp.data;
  },
};

export const tool_sms = {
  toolDefinition: td(
    "tool_sms",
    "Send an SMS text message via Twilio",
    {
      to: { type: "string", description: "Destination phone number (+1234567890)" },
      body: { type: "string", description: "SMS message text" },
    },
    ["to", "body"]
  ),
  async run(config, args) {
    const sid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const auth = config.authToken || process.env.TWILIO_AUTH_TOKEN;
    const from = config.fromNumber || process.env.TWILIO_FROM_NUMBER;
    if (!sid || !auth || !from) throw new Error("[tool_sms] Twilio credentials required");
    const resp = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      new URLSearchParams({ To: args.to, From: from, Body: args.body }),
      { auth: { username: sid, password: auth }, timeout: 10000 }
    );
    return { sid: resp.data.sid, status: resp.data.status };
  },
};

export const tool_webhook = {
  toolDefinition: td(
    "tool_webhook",
    "Send data to a webhook URL via POST",
    {
      url: { type: "string", description: "Webhook endpoint URL" },
      payload: { type: "object", description: "JSON payload to send" },
      headers: { type: "object", description: "Additional HTTP headers" },
    },
    ["url", "payload"]
  ),
  async run(config, args) {
    const resp = await axios.post(args.url, args.payload, {
      headers: { "Content-Type": "application/json", ...(args.headers || {}) },
      timeout: 15000,
    });
    return { status: resp.status, data: resp.data };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA & FILE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

const SAFE_FILE_ROOT = "/tmp/blinkbox";

function assertSafePath(rawPath) {
  const resolved = path.resolve(rawPath);
  if (!resolved.startsWith(SAFE_FILE_ROOT + "/") && resolved !== SAFE_FILE_ROOT) {
    throw new Error(`File access denied: paths must be under ${SAFE_FILE_ROOT}/. Got: "${resolved}"`);
  }
}

export const tool_file_read = {
  toolDefinition: td(
    "tool_file_read",
    `Read a file from the filesystem (restricted to ${SAFE_FILE_ROOT}/)`,
    {
      path: { type: "string", description: `File path under ${SAFE_FILE_ROOT}/` },
      encoding: { type: "string", description: "File encoding (utf8 default, base64, hex)" },
    },
    ["path"]
  ),
  async run(config, args) {
    assertSafePath(args.path);
    const content = await fs.readFile(args.path, args.encoding || "utf8");
    const stats = await fs.stat(args.path);
    return {
      path: args.path,
      content: typeof content === "string" ? content.slice(0, 50000) : content,
      size: stats.size,
      modified: stats.mtime,
    };
  },
};

export const tool_file_write = {
  toolDefinition: td(
    "tool_file_write",
    `Write content to a file on the filesystem (restricted to ${SAFE_FILE_ROOT}/)`,
    {
      path: { type: "string", description: `File path under ${SAFE_FILE_ROOT}/` },
      content: { type: "string", description: "Content to write" },
      append: { type: "boolean", description: "Append to file instead of overwriting" },
    },
    ["path", "content"]
  ),
  async run(config, args) {
    assertSafePath(args.path);
    if (args.append) {
      await fs.appendFile(args.path, args.content, "utf8");
    } else {
      await fs.mkdir(path.dirname(args.path), { recursive: true });
      await fs.writeFile(args.path, args.content, "utf8");
    }
    const stats = await fs.stat(args.path);
    return { path: args.path, size: stats.size, success: true };
  },
};

export const tool_csv = {
  toolDefinition: td(
    "tool_csv",
    "Parse CSV text into structured JSON data",
    {
      csv: { type: "string", description: "CSV text to parse" },
      delimiter: { type: "string", description: "Field delimiter (default comma)" },
      hasHeader: { type: "boolean", description: "First row is header (default true)" },
    },
    ["csv"]
  ),
  async run(config, args) {
    const delimiter = args.delimiter || ",";
    const lines = args.csv.trim().split("\n").map((l) => l.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, "")));
    if (args.hasHeader !== false && lines.length > 1) {
      const [headers, ...rows] = lines;
      return {
        headers,
        rows: rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]]))),
        count: rows.length,
      };
    }
    return { rows: lines, count: lines.length };
  },
};

export const tool_json = {
  toolDefinition: td(
    "tool_json",
    "Parse, validate, format, or query JSON data with a JSONPath expression",
    {
      data: { type: "string", description: "JSON string or object" },
      path: { type: "string", description: "JSONPath expression (e.g. $.users[0].name)" },
      format: { type: "boolean", description: "Pretty-print the JSON" },
    },
    ["data"]
  ),
  async run(config, args) {
    const parsed = typeof args.data === "string" ? JSON.parse(args.data) : args.data;
    if (!args.path) {
      return { parsed, formatted: args.format ? JSON.stringify(parsed, null, 2) : undefined };
    }
    const keys = args.path.replace(/^\$\.?/, "").split(/\.|\[(\d+)\]/).filter(Boolean);
    let current = parsed;
    for (const key of keys) {
      current = current?.[isNaN(key) ? key : parseInt(key)];
    }
    return { path: args.path, value: current };
  },
};

export const tool_pdf = {
  toolDefinition: td(
    "tool_pdf",
    "Extract text from a PDF file or URL",
    {
      source: { type: "string", description: "File path or URL to the PDF" },
    },
    ["source"]
  ),
  async run(config, args) {
    let pdfParse;
    try {
      pdfParse = (await import("pdf-parse")).default;
    } catch {
      throw new Error("[tool_pdf] pdf-parse package not installed");
    }
    let buffer;
    if (args.source.startsWith("http")) {
      const resp = await axios.get(args.source, { responseType: "arraybuffer", timeout: 30000 });
      buffer = Buffer.from(resp.data);
    } else {
      assertSafePath(args.source);
      buffer = await fs.readFile(args.source);
    }
    const data = await pdfParse(buffer);
    return { text: data.text.slice(0, 50000), pages: data.numpages, info: data.info };
  },
};

export const tool_excel = {
  toolDefinition: td(
    "tool_excel",
    "Read data from an Excel file (.xlsx)",
    {
      path: { type: "string", description: "Path to Excel file" },
      sheet: { type: "string", description: "Sheet name (defaults to first sheet)" },
    },
    ["path"]
  ),
  async run(config, args) {
    assertSafePath(args.path);
    let xlsx;
    try {
      xlsx = await import("xlsx");
    } catch {
      throw new Error("[tool_excel] xlsx package not installed. Run: npm i xlsx");
    }
    const workbook = xlsx.readFile(args.path);
    const sheetName = args.sheet || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    return { sheet: sheetName, rows: data, count: data.length };
  },
};

export const tool_ocr = {
  toolDefinition: td(
    "tool_ocr",
    "Extract text from an image using OCR",
    {
      imagePath: { type: "string", description: "Path or URL to the image file" },
      language: { type: "string", description: "Language code (eng default)" },
    },
    ["imagePath"]
  ),
  async run(config, args) {
    const key = config.apiKey || process.env.OCR_SPACE_API_KEY;
    if (!key) throw new Error("[tool_ocr] OCR.Space API key required (free at ocr.space)");
    const formData = new URLSearchParams({
      apikey: key,
      url: args.imagePath.startsWith("http") ? args.imagePath : "",
      language: args.language || "eng",
      isOverlayRequired: "false",
    });
    const resp = await axios.post("https://api.ocr.space/parse/image", formData, { timeout: 30000 });
    const text = resp.data?.ParsedResults?.[0]?.ParsedText || "";
    return { text, exitCode: resp.data?.OCRExitCode };
  },
};

export const tool_qr = {
  toolDefinition: td(
    "tool_qr",
    "Generate a QR code as a base64 PNG image",
    {
      text: { type: "string", description: "Text or URL to encode in the QR code" },
      size: { type: "number", description: "Size in pixels (default 300)" },
    },
    ["text"]
  ),
  async run(config, args) {
    const qrcode = (await import("qrcode")).default;
    const dataUrl = await qrcode.toDataURL(args.text, { width: args.size || 300 });
    return { text: args.text, dataUrl };
  },
};

export const tool_statistics = {
  toolDefinition: td(
    "tool_statistics",
    "Calculate statistical metrics for a numeric dataset",
    {
      data: { type: "array", items: { type: "number" }, description: "Array of numbers" },
    },
    ["data"]
  ),
  async run(config, args) {
    const d = args.data.map(Number).filter((n) => !isNaN(n)).sort((a, b) => a - b);
    if (!d.length) return { error: "Empty dataset" };
    const sum = d.reduce((a, b) => a + b, 0);
    const mean = sum / d.length;
    const variance = d.reduce((a, b) => a + (b - mean) ** 2, 0) / d.length;
    const mid = Math.floor(d.length / 2);
    return {
      count: d.length,
      sum,
      mean,
      median: d.length % 2 ? d[mid] : (d[mid - 1] + d[mid]) / 2,
      min: d[0],
      max: d[d.length - 1],
      stddev: Math.sqrt(variance),
      variance,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AI & ML TOOLS
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CODING & EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

export const tool_js = {
  toolDefinition: td(
    "tool_js",
    "Execute JavaScript code in a sandboxed environment",
    {
      code: { type: "string", description: "JavaScript code to execute" },
      input: { type: "object", description: "Data available as 'input' variable in the sandbox" },
    },
    ["code"]
  ),
  async run(config, args) {
    let ivm;
    try {
      ivm = (await import("isolated-vm")).default;
    } catch {
      throw new Error("[tool_js] isolated-vm not available");
    }
    const isolate = new ivm.Isolate({ memoryLimit: 64 });
    const context = await isolate.createContext();
    await context.global.set("input", new ivm.ExternalCopy(args.input || {}).copyInto());
    const script = await isolate.compileScript(`
      let __result;
      try { __result = (function() { ${args.code} })(); } catch(e) { __result = { error: e.message }; }
      JSON.stringify(__result);
    `);
    const result = await script.run(context, { timeout: 5000 });
    return { result: JSON.parse(result || "null") };
  },
};


export const tool_python = {
  toolDefinition: td(
    "tool_python",
    "Execute Python 3 code in an isolated sandbox (no network, no filesystem access outside /tmp)",
    {
      code: { type: "string", description: "Python code to execute" },
      timeout: { type: "number", description: "Execution timeout in seconds (default 10, max 300)" },
    },
    ["code"]
  ),
  async run(config, args, context = {}) {
    return containerExecute(
      { language: "python", command: args.code, timeoutSeconds: args.timeout || 10 },
      context.workspaceId || "default"
    );
  },
};

export const tool_bash = {
  toolDefinition: td(
    "tool_bash",
    "Run a bash/shell command in an isolated sandbox (no network, no host filesystem access)",
    {
      command: { type: "string", description: "Shell command to execute" },
      timeout: { type: "number", description: "Timeout in seconds (default 15, max 300)" },
    },
    ["command"]
  ),
  async run(config, args, context = {}) {
    return containerExecute(
      { language: "bash", command: args.command, timeoutSeconds: args.timeout || 15 },
      context.workspaceId || "default"
    );
  },
};

export const tool_git = {
  toolDefinition: td(
    "tool_git",
    "Run git commands on a repository",
    {
      command: { type: "string", description: "git sub-command (e.g. status, log --oneline -10, diff)" },
      repoPath: { type: "string", description: "Path to git repository" },
    },
    ["command"]
  ),
  async run(config, args, context = {}) {
    const cmd = args.repoPath
      ? `git -C ${JSON.stringify(args.repoPath)} ${args.command}`
      : `git ${args.command}`;
    return containerExecute(
      { language: "git", command: cmd, timeoutSeconds: 30 },
      context.workspaceId || "default"
    );
  },
};

export const tool_ssh = {
  toolDefinition: td(
    "tool_ssh",
    "Connect to a remote server via SSH and run a command",
    {
      host: { type: "string", description: "Remote host (IP or domain)" },
      username: { type: "string", description: "SSH username" },
      command: { type: "string", description: "Command to run on the remote server" },
      port: { type: "number", description: "SSH port (default 22)" },
    },
    ["host", "username", "command"]
  ),
  async run(config, args, ctx) {
    let ssh2;
    try {
      ssh2 = await import("ssh2");
    } catch {
      throw new Error("[tool_ssh] ssh2 package not installed. Run: npm i ssh2");
    }
    const { Client } = ssh2;
    const privateKey = config.privateKey || process.env.SSH_PRIVATE_KEY;
    const password = config.password || process.env.SSH_PASSWORD;
    return new Promise((resolve, reject) => {
      const conn = new Client();
      conn.on("ready", () => {
        conn.exec(args.command, (err, stream) => {
          if (err) return reject(err);
          let stdout = "", stderr = "";
          stream.on("data", (d) => (stdout += d));
          stream.stderr.on("data", (d) => (stderr += d));
          stream.on("close", (code) => {
            conn.end();
            resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code });
          });
        });
      });
      conn.on("error", reject);
      conn.connect({
        host: args.host,
        port: args.port || 22,
        username: args.username,
        ...(privateKey ? { privateKey } : { password }),
      });
    });
  },
};

export const tool_virtual_computer = {
  toolDefinition: td(
    "tool_virtual_computer",
    "Control a headless virtual computer session using Puppeteer automation",
    {
      action: { type: "string", description: "Action: open_url, click, type, screenshot" },
      url: { type: "string", description: "URL to navigate to (for open_url)" },
      selector: { type: "string", description: "CSS selector for click/type actions" },
      text: { type: "string", description: "Text to type (for type action)" },
    },
    ["action"]
  ),
  async run(config, args) {
    let puppeteer;
    try {
      puppeteer = (await import("puppeteer")).default;
    } catch {
      throw new Error("[tool_virtual_computer] Puppeteer not available");
    }
    if (args.url) assertSafeUrl(args.url);
    const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      if (args.url) await page.goto(args.url, { waitUntil: "networkidle2", timeout: 30000 });
      switch (args.action) {
        case "click":
          await page.click(args.selector);
          return { success: true, action: "click", selector: args.selector };
        case "type":
          await page.type(args.selector, args.text || "");
          return { success: true, action: "type" };
        case "screenshot": {
          const img = await page.screenshot({ encoding: "base64" });
          return { screenshot: `data:image/png;base64,${img}`, url: page.url() };
        }
        default: {
          const img = await page.screenshot({ encoding: "base64" });
          return { url: page.url(), title: await page.title(), screenshot: `data:image/png;base64,${img}` };
        }
      }
    } finally {
      await browser.close();
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DATABASES
// ─────────────────────────────────────────────────────────────────────────────

export const tool_sql = {
  toolDefinition: td(
    "tool_sql",
    "Execute a SQL query on a PostgreSQL database",
    {
      query: { type: "string", description: "SQL query to execute" },
      params: { type: "array", description: "Query parameters for prepared statement" },
    },
    ["query"]
  ),
  async run(config, args) {
    const { Pool } = (await import("pg")).default || (await import("pg"));
    const pool = new Pool({
      connectionString: config.connectionString || process.env.POSTGRES_URL,
      ssl: config.ssl === "true" ? { rejectUnauthorized: false } : undefined,
    });
    try {
      const result = await pool.query(args.query, args.params || []);
      return { rows: result.rows, rowCount: result.rowCount, command: result.command };
    } finally {
      await pool.end();
    }
  },
};

export const tool_mongodb = {
  toolDefinition: td(
    "tool_mongodb",
    "Query or insert documents in MongoDB",
    {
      operation: { type: "string", description: "Operation: find, insertOne, insertMany, updateOne, deleteOne, aggregate" },
      collection: { type: "string", description: "Collection name" },
      filter: { type: "object", description: "Query filter/document" },
      update: { type: "object", description: "Update operators for updateOne" },
      options: { type: "object", description: "Additional options" },
    },
    ["operation", "collection"]
  ),
  async run(config, args) {
    const mongoose = (await import("mongoose")).default;
    const uri = config.uri || process.env.MONGODB_URI;
    if (!uri) throw new Error("[tool_mongodb] MongoDB URI required");
    const conn = await mongoose.createConnection(uri).asPromise();
    try {
      const col = conn.collection(args.collection);
      switch (args.operation) {
        case "find": return { results: await col.find(args.filter || {}).limit(args.options?.limit || 50).toArray() };
        case "insertOne": return await col.insertOne(args.filter || {});
        case "insertMany": return await col.insertMany(Array.isArray(args.filter) ? args.filter : [args.filter]);
        case "updateOne": return await col.updateOne(args.filter || {}, args.update || {});
        case "deleteOne": return await col.deleteOne(args.filter || {});
        case "aggregate": return { results: await col.aggregate(args.filter || []).toArray() };
        default: throw new Error(`Unknown operation: ${args.operation}`);
      }
    } finally {
      await conn.close();
    }
  },
};

export const tool_redis = {
  toolDefinition: td(
    "tool_redis",
    "Read and write data in Redis",
    {
      operation: { type: "string", description: "Operation: get, set, del, exists, lpush, lrange, hset, hget, keys" },
      key: { type: "string", description: "Redis key" },
      value: { type: "string", description: "Value to set" },
      ttl: { type: "number", description: "TTL in seconds for set operations" },
    },
    ["operation", "key"]
  ),
  async run(config, args) {
    const { Redis } = await import("ioredis");
    const client = new Redis(config.url || process.env.REDIS_URL || "redis://localhost:6379");
    try {
      switch (args.operation) {
        case "get": return { key: args.key, value: await client.get(args.key) };
        case "set": {
          if (args.ttl) await client.setex(args.key, args.ttl, args.value || "");
          else await client.set(args.key, args.value || "");
          return { success: true };
        }
        case "del": return { deleted: await client.del(args.key) };
        case "exists": return { exists: !!(await client.exists(args.key)) };
        case "keys": return { keys: await client.keys(args.key || "*") };
        case "lpush": return { length: await client.lpush(args.key, args.value || "") };
        case "lrange": return { values: await client.lrange(args.key, 0, -1) };
        default: throw new Error(`Unknown Redis operation: ${args.operation}`);
      }
    } finally {
      client.disconnect();
    }
  },
};

export const tool_elasticsearch = {
  toolDefinition: td(
    "tool_elasticsearch",
    "Search and index documents in Elasticsearch",
    {
      operation: { type: "string", description: "Operation: search, index, delete, get" },
      index: { type: "string", description: "Index name" },
      query: { type: "object", description: "Search query (for search)" },
      document: { type: "object", description: "Document to index" },
      id: { type: "string", description: "Document ID (for get/delete)" },
    },
    ["operation", "index"]
  ),
  async run(config, args) {
    const baseUrl = config.url || process.env.ELASTICSEARCH_URL || "http://localhost:9200";
    const auth = config.apiKey ? { headers: { Authorization: `ApiKey ${config.apiKey}` } } : {};
    switch (args.operation) {
      case "search": {
        const resp = await axios.post(`${baseUrl}/${args.index}/_search`, args.query || { query: { match_all: {} } }, { ...auth, timeout: 15000 });
        return { hits: resp.data.hits.hits, total: resp.data.hits.total };
      }
      case "index": {
        const url = args.id ? `${baseUrl}/${args.index}/_doc/${args.id}` : `${baseUrl}/${args.index}/_doc`;
        const resp = await axios.post(url, args.document, { ...auth, timeout: 10000 });
        return resp.data;
      }
      case "get": {
        const resp = await axios.get(`${baseUrl}/${args.index}/_doc/${args.id}`, { ...auth, timeout: 10000 });
        return resp.data;
      }
      case "delete": {
        const resp = await axios.delete(`${baseUrl}/${args.index}/_doc/${args.id}`, { ...auth, timeout: 10000 });
        return resp.data;
      }
      default: throw new Error(`Unknown Elasticsearch operation: ${args.operation}`);
    }
  },
};

export const tool_supabase = {
  toolDefinition: td(
    "tool_supabase",
    "Query Supabase tables using the Supabase client",
    {
      table: { type: "string", description: "Table name" },
      operation: { type: "string", description: "Operation: select, insert, update, delete, upsert" },
      filter: { type: "object", description: "Row filters (column: value pairs)" },
      data: { type: "object", description: "Data to insert/update" },
      columns: { type: "string", description: "Columns to select (default *)" },
    },
    ["table", "operation"]
  ),
  async run(config, args) {
    const { createClient } = await import("@supabase/supabase-js");
    const url = config.url || process.env.SUPABASE_URL;
    const key = config.anonKey || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("[tool_supabase] Supabase URL and anon key required");
    const client = createClient(url, key);
    let query = client.from(args.table);
    switch (args.operation) {
      case "select": {
        let q = query.select(args.columns || "*");
        if (args.filter) for (const [k, v] of Object.entries(args.filter)) q = q.eq(k, v);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return { rows: data, count: data?.length };
      }
      case "insert": {
        const { data, error } = await query.insert(args.data);
        if (error) throw new Error(error.message);
        return { inserted: data };
      }
      case "update": {
        let q = query.update(args.data);
        if (args.filter) for (const [k, v] of Object.entries(args.filter)) q = q.eq(k, v);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return { updated: data };
      }
      case "delete": {
        let q = query.delete();
        if (args.filter) for (const [k, v] of Object.entries(args.filter)) q = q.eq(k, v);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return { deleted: data };
      }
      default: throw new Error(`Unknown Supabase operation: ${args.operation}`);
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DEVOPS & INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

export const tool_docker_exec = {
  toolDefinition: td(
    "tool_docker_exec",
    "Execute a command inside a running Docker container",
    {
      containerId: { type: "string", description: "Container name or ID" },
      command: { type: "string", description: "Command to run inside the container" },
    },
    ["containerId", "command"]
  ),
  async run(config, args, ctx = {}) {
    return containerExecute({
      language: "docker_cli",
      command: `docker exec ${args.containerId} sh -c ${JSON.stringify(args.command)}`,
      timeoutSeconds: 30,
    }, ctx.workspaceId || "default");
  },
};

export const tool_docker_compose = {
  toolDefinition: td(
    "tool_docker_compose",
    "Run docker-compose commands (up, down, logs, ps)",
    {
      command: { type: "string", description: "docker-compose sub-command (e.g. up -d, down, logs, ps)" },
      directory: { type: "string", description: "Directory containing docker-compose.yml" },
    },
    ["command"]
  ),
  async run(config, args, ctx = {}) {
    const cmd = args.directory
      ? `docker compose -f ${JSON.stringify(`${args.directory}/docker-compose.yml`)} ${args.command}`
      : `docker compose ${args.command}`;
    return containerExecute({ language: "docker_cli", command: cmd, timeoutSeconds: 60 }, ctx.workspaceId || "default");
  },
};

export const tool_kubernetes = {
  toolDefinition: td(
    "tool_kubernetes",
    "Run kubectl commands against a Kubernetes cluster",
    {
      command: { type: "string", description: "kubectl sub-command (e.g. get pods, describe deployment myapp)" },
      namespace: { type: "string", description: "Kubernetes namespace (default: default)" },
    },
    ["command"]
  ),
  async run(config, args, ctx = {}) {
    const ns = args.namespace ? `-n ${args.namespace}` : "";
    const envVars = [];
    if (config.kubeconfig) envVars.push({ key: "KUBECONFIG_DATA", value: config.kubeconfig });
    return containerExecute({ language: "kubectl", command: `${args.command} ${ns}`, envVars, timeoutSeconds: 30 }, ctx.workspaceId || "default");
  },
};

export const tool_terraform = {
  toolDefinition: td(
    "tool_terraform",
    "Run Terraform commands (plan, apply, destroy, show)",
    {
      command: { type: "string", description: "terraform sub-command (e.g. plan, show, output)" },
      directory: { type: "string", description: "Directory with Terraform configs" },
    },
    ["command"]
  ),
  async run(config, args, ctx = {}) {
    const cmd = args.directory ? `cd ${JSON.stringify(args.directory)} && terraform ${args.command}` : args.command;
    return containerExecute({ language: "terraform", command: cmd, timeoutSeconds: 120 }, ctx.workspaceId || "default");
  },
};

export const tool_ansible = {
  toolDefinition: td(
    "tool_ansible",
    "Run Ansible playbooks or ad-hoc commands",
    {
      command: { type: "string", description: "ansible-playbook or ansible ad-hoc command arguments" },
      type: { type: "string", description: "playbook or adhoc (default: adhoc)" },
    },
    ["command"]
  ),
  async run(config, args, ctx = {}) {
    const bin = args.type === "playbook" ? "ansible-playbook" : "ansible";
    return containerExecute({ language: "ansible", command: `${bin} ${args.command}`, timeoutSeconds: 120 }, ctx.workspaceId || "default");
  },
};

export const tool_aws = {
  toolDefinition: td(
    "tool_aws",
    "Run AWS CLI commands",
    {
      command: { type: "string", description: "AWS CLI command (e.g. s3 ls, ec2 describe-instances)" },
    },
    ["command"]
  ),
  async run(config, args, ctx = {}) {
    const envVars = [];
    if (config.accessKeyId) envVars.push({ key: "AWS_ACCESS_KEY_ID", value: config.accessKeyId });
    if (config.secretAccessKey) envVars.push({ key: "AWS_SECRET_ACCESS_KEY", value: config.secretAccessKey });
    if (config.region) envVars.push({ key: "AWS_DEFAULT_REGION", value: config.region });
    const result = await containerExecute({ language: "aws", command: `${args.command} --output json`, envVars, timeoutSeconds: 60 }, ctx.workspaceId || "default");
    try { return { result: JSON.parse(result.stdout), stderr: result.stderr }; }
    catch { return { stdout: result.stdout.trim(), stderr: result.stderr }; }
  },
};

export const tool_gcp = {
  toolDefinition: td(
    "tool_gcp",
    "Run Google Cloud CLI (gcloud) commands",
    {
      command: { type: "string", description: "gcloud sub-command (e.g. compute instances list)" },
    },
    ["command"]
  ),
  async run(config, args, ctx = {}) {
    return containerExecute({ language: "gcloud", command: `${args.command} --format=json`, timeoutSeconds: 60 }, ctx.workspaceId || "default");
  },
};

export const tool_azure = {
  toolDefinition: td(
    "tool_azure",
    "Run Azure CLI (az) commands",
    {
      command: { type: "string", description: "az sub-command (e.g. vm list, group show)" },
    },
    ["command"]
  ),
  async run(config, args, ctx = {}) {
    return containerExecute({ language: "az", command: `${args.command} -o json`, timeoutSeconds: 60 }, ctx.workspaceId || "default");
  },
};

export const tool_vercel_deploy = {
  toolDefinition: td(
    "tool_vercel_deploy",
    "Trigger a Vercel deployment via API",
    {
      projectId: { type: "string", description: "Vercel project ID or name" },
      team: { type: "string", description: "Vercel team slug (optional)" },
    },
    ["projectId"]
  ),
  async run(config, args) {
    const token = config.token || process.env.VERCEL_TOKEN;
    if (!token) throw new Error("[tool_vercel_deploy] Vercel token required");
    const params = args.team ? `?teamId=${args.team}` : "";
    const resp = await axios.post(
      `https://api.vercel.com/v13/deployments${params}`,
      { name: args.projectId, target: "production" },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
    );
    return { id: resp.data.id, url: resp.data.url, state: resp.data.readyState };
  },
};

export const tool_nmap = {
  toolDefinition: td(
    "tool_nmap",
    "Scan network ports and services using nmap",
    {
      target: { type: "string", description: "Target host or IP range" },
      flags: { type: "string", description: "nmap flags (e.g. -p 80,443 -sV)" },
    },
    ["target"]
  ),
  async run(config, args, ctx = {}) {
    return containerExecute({
      language: "nmap",
      command: `${args.flags || "-sV --open"} ${args.target}`,
      timeoutSeconds: 60,
    }, ctx.workspaceId || "default");
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY & CRYPTO
// ─────────────────────────────────────────────────────────────────────────────

export const tool_hash = {
  toolDefinition: td(
    "tool_hash",
    "Hash a string using MD5, SHA-1, SHA-256, SHA-512, or bcrypt",
    {
      text: { type: "string", description: "Text to hash" },
      algorithm: { type: "string", description: "Algorithm: md5, sha1, sha256, sha512 (default sha256)" },
    },
    ["text"]
  ),
  async run(config, args) {
    const algo = args.algorithm || "sha256";
    const hash = crypto.createHash(algo).update(args.text).digest("hex");
    return { algorithm: algo, hash };
  },
};

export const tool_crypto = {
  toolDefinition: td(
    "tool_crypto",
    "Encrypt or decrypt data using AES-256-GCM",
    {
      operation: { type: "string", description: "encrypt or decrypt" },
      data: { type: "string", description: "Data to encrypt/decrypt" },
      key: { type: "string", description: "32-byte hex key (64 hex chars). If omitted, a random key is generated." },
    },
    ["operation", "data"]
  ),
  async run(config, args) {
    if (args.operation === "encrypt") {
      const key = args.key ? Buffer.from(args.key, "hex") : crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([cipher.update(args.data, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      return {
        encrypted: encrypted.toString("hex"),
        iv: iv.toString("hex"),
        tag: tag.toString("hex"),
        key: key.toString("hex"),
      };
    } else {
      if (!args.key) throw new Error("[tool_crypto] Key required for decryption");
      const parts = args.data.split(":");
      const [encHex, ivHex, tagHex] = parts.length === 3 ? parts : [args.data, config.iv, config.tag];
      const key = Buffer.from(args.key, "hex");
      const iv = Buffer.from(ivHex, "hex");
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(Buffer.from(tagHex, "hex"));
      const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]);
      return { decrypted: decrypted.toString("utf8") };
    }
  },
};

export const tool_jwt = {
  toolDefinition: td(
    "tool_jwt",
    "Create or verify a JSON Web Token",
    {
      operation: { type: "string", description: "sign or verify" },
      payload: { type: "object", description: "JWT payload (for sign)" },
      token: { type: "string", description: "JWT token (for verify)" },
      secret: { type: "string", description: "HMAC secret key" },
      expiresIn: { type: "string", description: "Expiry (e.g. 1h, 7d)" },
    },
    ["operation"]
  ),
  async run(config, args) {
    const jwt = (await import("jsonwebtoken")).default;
    const secret = args.secret || config.jwtSecret || process.env.JWT_SECRET;
    if (!secret) throw new Error("[tool_jwt] JWT secret required");
    if (args.operation === "sign") {
      const token = jwt.sign(args.payload || {}, secret, { expiresIn: args.expiresIn || "1h" });
      return { token };
    } else {
      try {
        const decoded = jwt.verify(args.token, secret);
        return { valid: true, payload: decoded };
      } catch (err) {
        return { valid: false, error: err.message };
      }
    }
  },
};

export const tool_password = {
  toolDefinition: td(
    "tool_password",
    "Generate a secure random password",
    {
      length: { type: "number", description: "Password length (default 16)" },
      includeSymbols: { type: "boolean", description: "Include symbols (default true)" },
      includeNumbers: { type: "boolean", description: "Include numbers (default true)" },
    },
    []
  ),
  async run(config, args) {
    const len = args.length || 16;
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" +
      (args.includeNumbers !== false ? "0123456789" : "") +
      (args.includeSymbols !== false ? "!@#$%^&*()-_=+[]{}|;:,.<>?" : "");
    let pw = "";
    for (let i = 0; i < len; i++) {
      pw += chars[crypto.randomInt(chars.length)];
    }
    return { password: pw, length: pw.length };
  },
};

export const tool_uuid = {
  toolDefinition: td(
    "tool_uuid",
    "Generate one or more UUIDs",
    {
      count: { type: "number", description: "Number of UUIDs to generate (default 1)" },
      version: { type: "number", description: "UUID version: 4 (default random) or 1 (time-based via node)" },
    },
    []
  ),
  async run(config, args) {
    const count = Math.min(args.count || 1, 100);
    const uuids = Array.from({ length: count }, () => crypto.randomUUID());
    return count === 1 ? { uuid: uuids[0] } : { uuids };
  },
};

export const tool_base = {
  toolDefinition: td(
    "tool_base",
    "Encode or decode data in Base64, Hex, or URL encoding",
    {
      operation: { type: "string", description: "encode or decode" },
      data: { type: "string", description: "Data to encode/decode" },
      encoding: { type: "string", description: "base64, hex, url (default base64)" },
    },
    ["operation", "data"]
  ),
  async run(config, args) {
    const enc = args.encoding || "base64";
    if (args.operation === "encode") {
      if (enc === "base64") return { result: Buffer.from(args.data).toString("base64") };
      if (enc === "hex") return { result: Buffer.from(args.data).toString("hex") };
      if (enc === "url") return { result: encodeURIComponent(args.data) };
    } else {
      if (enc === "base64") return { result: Buffer.from(args.data, "base64").toString("utf8") };
      if (enc === "hex") return { result: Buffer.from(args.data, "hex").toString("utf8") };
      if (enc === "url") return { result: decodeURIComponent(args.data) };
    }
    throw new Error(`Unknown encoding: ${enc}`);
  },
};

export const tool_regex = {
  toolDefinition: td(
    "tool_regex",
    "Test or apply a regular expression against text",
    {
      pattern: { type: "string", description: "Regular expression pattern" },
      text: { type: "string", description: "Text to test or extract from" },
      flags: { type: "string", description: "Regex flags (g, i, m, s)" },
      operation: { type: "string", description: "test, match, replace, split" },
      replacement: { type: "string", description: "Replacement string for replace operation" },
    },
    ["pattern", "text"]
  ),
  async run(config, args) {
    let re;
    try { re = new RegExp(args.pattern, args.flags || "g"); } catch (e) { throw new Error(`Invalid regex: ${e.message}`); }

    const safeFlags = (args.flags || "g").replace(/[^gimsuy]/g, "");
    if (safeFlags !== (args.flags || "g")) throw new Error("Invalid regex flags");

    const op = args.operation || "match";
    return await Promise.race([
      new Promise((resolve, reject) => {
        try {
          switch (op) {
            case "test": resolve({ matches: re.test(args.text) }); break;
            case "match": resolve({ matches: args.text.match(re) || [] }); break;
            case "replace": resolve({ result: args.text.replace(re, args.replacement || "") }); break;
            case "split": resolve({ parts: args.text.split(re) }); break;
            default: resolve({ matches: args.text.match(re) || [] });
          }
        } catch (e) { reject(e); }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Regex operation timed out (possible ReDoS)")), 5000)),
    ]);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TASK & WORKFLOW MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const tool_memory_store = {
  toolDefinition: td(
    "tool_memory_store",
    "Store and retrieve values in the agent's persistent memory for this workflow run",
    {
      operation: { type: "string", description: "get, set, delete, list" },
      key: { type: "string", description: "Memory key" },
      value: { type: "string", description: "Value to store (for set)" },
    },
    ["operation"]
  ),
  async run(config, args, ctx) {
    const { redis } = await import("../infra/redis.client.js");
    const scope = `agent_memory:${ctx?.workflowId || "global"}`;
    switch (args.operation) {
      case "get": return { key: args.key, value: await redis.hget(scope, args.key) };
      case "set": {
        await redis.hset(scope, args.key, typeof args.value === "string" ? args.value : JSON.stringify(args.value));
        await redis.expire(scope, 86400 * 7);
        return { success: true };
      }
      case "delete": return { deleted: await redis.hdel(scope, args.key) };
      case "list": return { keys: await redis.hkeys(scope) };
      default: throw new Error(`Unknown memory operation: ${args.operation}`);
    }
  },
};

export const tool_think = {
  toolDefinition: td(
    "tool_think",
    "Use this to think through a problem step-by-step before taking action. The thought is not shown to the user.",
    {
      thought: { type: "string", description: "Your internal reasoning and thinking process" },
    },
    ["thought"]
  ),
  async run(config, args) {
    return { thought: args.thought, status: "thought_recorded" };
  },
};

export const tool_calculator = {
  toolDefinition: td(
    "tool_calculator",
    "Evaluate a mathematical expression safely",
    { expression: { type: "string", description: "Math expression (e.g. (100 * 1.08) / 3)" } },
    ["expression"]
  ),
  async run(config, args) {
    const sanitized = args.expression.replace(/[^0-9+\-*/().,%^ ]/g, "");
    let result;
    try {
      result = Function(`"use strict"; return (${sanitized})`)();
    } catch (e) {
      throw new Error(`[tool_calculator] Invalid expression: ${e.message}`);
    }
    return { expression: args.expression, result };
  },
};

export const tool_datetime = {
  toolDefinition: td(
    "tool_datetime",
    "Get current date/time or format and parse dates",
    {
      operation: { type: "string", description: "now, format, parse, diff, add" },
      date: { type: "string", description: "Date string to format/parse (ISO or human-readable)" },
      format: { type: "string", description: "Output format: iso, utc, local, unix, relative" },
      unit: { type: "string", description: "Unit for diff/add: days, hours, minutes, seconds" },
      amount: { type: "number", description: "Amount to add (for add operation)" },
      date2: { type: "string", description: "Second date for diff" },
    },
    []
  ),
  async run(config, args) {
    const d1 = args.date ? new Date(args.date) : new Date();
    switch (args.operation || "now") {
      case "now":
        return { iso: d1.toISOString(), utc: d1.toUTCString(), unix: Math.floor(d1.getTime() / 1000) };
      case "format":
        if (args.format === "unix") return { result: Math.floor(d1.getTime() / 1000) };
        if (args.format === "utc") return { result: d1.toUTCString() };
        if (args.format === "local") return { result: d1.toLocaleString() };
        return { result: d1.toISOString() };
      case "diff": {
        const d2 = new Date(args.date2);
        const diffMs = Math.abs(d2 - d1);
        const units = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
        return { diff: diffMs / (units[args.unit || "days"]), unit: args.unit || "days" };
      }
      case "add": {
        const units = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
        const result = new Date(d1.getTime() + (args.amount || 0) * (units[args.unit || "days"]));
        return { result: result.toISOString() };
      }
      default: return { iso: d1.toISOString() };
    }
  },
};

export const tool_calendar = {
  toolDefinition: td(
    "tool_calendar",
    "Create or list events in Google Calendar",
    {
      operation: { type: "string", description: "list or create" },
      summary: { type: "string", description: "Event title (for create)" },
      start: { type: "string", description: "Start datetime ISO string" },
      end: { type: "string", description: "End datetime ISO string" },
      calendarId: { type: "string", description: "Calendar ID (default: primary)" },
    },
    ["operation"]
  ),
  async run(config, args) {
    const token = config.accessToken || process.env.GOOGLE_ACCESS_TOKEN;
    if (!token) throw new Error("[tool_calendar] Google access token required");
    const calId = args.calendarId || "primary";
    if (args.operation === "list") {
      const resp = await axios.get(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { timeMin: new Date().toISOString(), maxResults: 10, singleEvents: true, orderBy: "startTime" },
        timeout: 10000,
      });
      return { events: resp.data.items };
    }
    const resp = await axios.post(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
      { summary: args.summary, start: { dateTime: args.start }, end: { dateTime: args.end } },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
    );
    return { id: resp.data.id, htmlLink: resp.data.htmlLink };
  },
};

export const tool_call_workflow = {
  toolDefinition: td(
    "tool_call_workflow",
    "Trigger another Blinkbox workflow by ID and optionally wait for the result",
    {
      workflowId: { type: "string", description: "ID of the workflow to trigger" },
      payload: { type: "object", description: "Input payload for the workflow" },
      waitForResult: { type: "boolean", description: "Wait for workflow to complete (default false)" },
    },
    ["workflowId"]
  ),
  async run(config, args, ctx) {
    const baseUrl = process.env.BACKEND_URL || "http://localhost:3000";
    const resp = await axios.post(
      `${baseUrl}/api/workflows/${args.workflowId}/trigger`,
      { payload: args.payload || {} },
      { headers: { Authorization: `Bearer ${ctx?.token || ""}` }, timeout: 10000 }
    );
    return { triggered: true, executionId: resp.data?.executionId };
  },
};

export const tool_approval = {
  toolDefinition: td(
    "tool_approval",
    "Pause execution and request human approval before continuing",
    {
      message: { type: "string", description: "What the human needs to approve" },
      options: { type: "array", items: { type: "string" }, description: "Options for the human to choose from" },
    },
    ["message"]
  ),
  async run(config, args, ctx) {
    return {
      status: "awaiting_approval",
      message: args.message,
      options: args.options || ["Approve", "Reject"],
      executionId: ctx?.executionId,
      note: "Execution paused. Resume via the approval endpoint.",
    };
  },
};

export const tool_mcp_client = {
  toolDefinition: td(
    "tool_mcp_client",
    "Call a tool on an external MCP (Model Context Protocol) server",
    {
      serverUrl: { type: "string", description: "MCP server URL" },
      toolName: { type: "string", description: "Name of the MCP tool to call" },
      arguments: { type: "object", description: "Arguments to pass to the MCP tool" },
    },
    ["serverUrl", "toolName"]
  ),
  async run(config, args) {
    const resp = await axios.post(
      `${args.serverUrl}/tools/call`,
      { name: args.toolName, arguments: args.arguments || {} },
      { headers: { "Content-Type": "application/json" }, timeout: 30000 }
    );
    return resp.data;
  },
};

export const tool_data_diff = {
  toolDefinition: td(
    "tool_data_diff",
    "Compare two JSON objects or arrays and return added, removed, and changed keys",
    {
      before: { type: "string", description: "JSON string of the original value" },
      after: { type: "string", description: "JSON string of the new value" },
    },
    ["before", "after"]
  ),
  async run(config, args) {
    let before, after;
    try { before = typeof args.before === "string" ? JSON.parse(args.before) : args.before; }
    catch { throw new Error("[tool_data_diff] 'before' is not valid JSON"); }
    try { after = typeof args.after === "string" ? JSON.parse(args.after) : args.after; }
    catch { throw new Error("[tool_data_diff] 'after' is not valid JSON"); }

    function diff(a, b, path = "") {
      const added = [], removed = [], changed = [];
      const allKeys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
      for (const k of allKeys) {
        const p = path ? `${path}.${k}` : k;
        if (!(k in (a ?? {}))) { added.push({ path: p, value: b[k] }); }
        else if (!(k in (b ?? {}))) { removed.push({ path: p, value: a[k] }); }
        else if (typeof a[k] === "object" && typeof b[k] === "object" && a[k] !== null && b[k] !== null) {
          const sub = diff(a[k], b[k], p);
          added.push(...sub.added); removed.push(...sub.removed); changed.push(...sub.changed);
        } else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
          changed.push({ path: p, before: a[k], after: b[k] });
        }
      }
      return { added, removed, changed };
    }

    const result = diff(before, after);
    return { ...result, totalChanges: result.added.length + result.removed.length + result.changed.length };
  },
};

export const tool_youtube_search = {
  toolDefinition: td(
    "tool_youtube_search",
    "Search YouTube for videos using the Data API v3",
    {
      query: { type: "string", description: "Search query" },
      maxResults: { type: "number", description: "Max results (default 5)" },
    },
    ["query"]
  ),
  async run(config, args) {
    const key = config.apiKey || process.env.YOUTUBE_API_KEY;
    if (!key) throw new Error("[tool_youtube_search] YouTube Data API key required");
    const resp = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: { key, q: args.query, part: "snippet", type: "video", maxResults: args.maxResults || 5 },
      timeout: 10000,
    });
    return {
      results: resp.data.items?.map((i) => ({
        title: i.snippet.title,
        description: i.snippet.description,
        videoId: i.id.videoId,
        url: `https://youtube.com/watch?v=${i.id.videoId}`,
        channel: i.snippet.channelTitle,
      })) || [],
    };
  },
};
