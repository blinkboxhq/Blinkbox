/**
 * WEB SCRAPER NODE
 *
 * Two extraction engines:
 *
 *   engine: "browser" (default) — Puppeteer-cluster for JS-rendered pages
 *   engine: "reader"            — Jina Reader API for fast, clean Markdown
 *                                 (no browser, no Puppeteer, LLM-optimized)
 *
 * Output formats (browser engine):
 *   - "markdown": Clean Markdown text (ideal for piping into AI Agent)
 *   - "text":     Raw body text (keyword search, legacy)
 *   - "html":     Raw HTML of the page
 *   - "targeted": Keyword-based extraction (original informer behavior)
 *
 * Config:
 *   source          — URL to scrape (required)
 *   engine          — "browser" (default) | "reader" (Jina Reader API)
 *   outputFormat    — "markdown" (default) | "text" | "html" | "targeted"
 *   particularThing — Keyword for targeted mode
 *   waitFor         — CSS selector to wait for before extraction (optional)
 *   maxScrollDepth  — Max scroll pixels (default: 4000)
 *   credentialId    — Vault ref for Jina API key (optional, for higher rate limits)
 */

import axios from "axios";
import { browserCluster } from "../core/browser.manager.js";
import Credential from "../models/credential.model.js";
import { decrypt } from "../utils/crypto.js";

const JINA_READER_URL = "https://r.jina.ai/";

export default {
  async run(config, input, context = {}) {
    const {
      source,
      engine = "browser",
      outputFormat = "markdown",
      particularThing = "",
      waitFor = "",
      maxScrollDepth = 4000,
      credentialId,
    } = config;

    if (!source) throw new Error("Web Scraper: 'source' URL is required.");

    // ── Jina Reader Engine (fast, no Puppeteer) ────────────────────────────
    if (engine === "reader") {
      const headers = {
        Accept: "application/json",
        "X-Return-Format": "markdown",
      };

      // Optional: authenticate for higher rate limits
      if (credentialId) {
        const query = { _id: credentialId };
        if (context.workspaceId) query.workspaceId = context.workspaceId;
        const cred = await Credential.findOne(query);
        if (cred) {
          const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
      }

      try {
        const response = await axios.get(`${JINA_READER_URL}${source}`, {
          headers,
          timeout: 30000,
          maxContentLength: 5 * 1024 * 1024,
        });

        const data = response.data;
        return {
          source: data.url || source,
          title: data.title || "",
          httpStatus: 200,
          outputFormat: "markdown",
          content: data.content || data.text || (typeof data === "string" ? data : ""),
        };
      } catch (err) {
        throw new Error(`Web Scraper (Reader): ${err.response?.status || err.code} — ${err.message}`);
      }
    }

    // ── Puppeteer Browser Engine (original) ────────────────────────────────
    const result = await browserCluster.execute(
      { source, outputFormat, particularThing, waitFor, maxScrollDepth },
      async ({ page, data }) => {
        await page.setUserAgent(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        );
        await page.setViewport({ width: 1440, height: 900 });

        const response = await page.goto(data.source, {
          waitUntil: "networkidle2",
          timeout: 45000,
        });

        // Optional: wait for a specific element
        if (data.waitFor) {
          await page.waitForSelector(data.waitFor, { timeout: 10000 }).catch(() => {});
        }

        // Scroll to trigger lazy content
        await page.evaluate(async (maxScroll) => {
          await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 200;
            const timer = setInterval(() => {
              window.scrollBy(0, distance);
              totalHeight += distance;
              if (totalHeight >= document.body.scrollHeight || totalHeight > maxScroll) {
                clearInterval(timer);
                resolve();
              }
            }, 150);
          });
        }, data.maxScrollDepth);

        await new Promise((r) => setTimeout(r, 2000));

        const pageTitle = await page.title();
        const finalUrl = page.url();
        const httpStatus = response.status();

        let content;

        switch (data.outputFormat) {
          case "html":
            content = await page.content();
            break;

          case "text":
            content = await page.evaluate(() => document.body.innerText || "");
            break;

          case "targeted":
            content = await page.evaluate((keyword) => {
              const bodyText = document.body.innerText || "";
              const keywordLower = keyword.toLowerCase();
              const chunks = bodyText.split(/(?<=[.!?\n])\s+/);
              let results = [];
              for (const chunk of chunks) {
                if (chunk.toLowerCase().includes(keywordLower) && chunk.length > 15) {
                  results.push(chunk.trim().replace(/\s+/g, " "));
                }
              }
              results = [...new Set(results)].slice(0, 10);

              if (results.length === 0) {
                const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
                  .map((h) => h.innerText.trim())
                  .filter((t) => t.length > 5);
                return {
                  found: false,
                  headings: [...new Set(headings)].slice(0, 5),
                };
              }
              return {
                found: true,
                matches: results.map((text, i) => ({
                  index: i + 1,
                  content: text.substring(0, 600),
                })),
              };
            }, data.particularThing);
            break;

          case "markdown":
          default:
            content = await page.evaluate(() => {
              const lines = [];
              const walk = (el) => {
                const tag = el.tagName?.toLowerCase();
                if (tag === "script" || tag === "style" || tag === "noscript") return;

                if (tag === "h1") lines.push(`\n# ${el.innerText.trim()}\n`);
                else if (tag === "h2") lines.push(`\n## ${el.innerText.trim()}\n`);
                else if (tag === "h3") lines.push(`\n### ${el.innerText.trim()}\n`);
                else if (tag === "p") lines.push(`${el.innerText.trim()}\n`);
                else if (tag === "li") lines.push(`- ${el.innerText.trim()}`);
                else if (tag === "a" && el.href && el.innerText.trim()) {
                  lines.push(`[${el.innerText.trim()}](${el.href})`);
                } else if (tag === "img" && el.alt) {
                  lines.push(`![${el.alt}](${el.src})`);
                } else if (tag === "table") {
                  const rows = Array.from(el.querySelectorAll("tr"));
                  for (const row of rows) {
                    const cells = Array.from(row.querySelectorAll("td, th"))
                      .map((c) => c.innerText.trim());
                    lines.push(`| ${cells.join(" | ")} |`);
                  }
                } else if (el.children?.length) {
                  for (const child of el.children) walk(child);
                } else if (el.innerText?.trim()) {
                  lines.push(el.innerText.trim());
                }
              };

              walk(document.body);
              return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
            });
            break;
        }

        return {
          source: finalUrl,
          title: pageTitle,
          httpStatus,
          outputFormat: data.outputFormat,
          content,
        };
      },
    );

    return result;
  },
};
