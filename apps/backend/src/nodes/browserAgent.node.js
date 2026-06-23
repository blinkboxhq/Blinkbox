/**
 * BROWSER AGENT NODE
 * AI-driven Puppeteer automation. Give it a natural language goal,
 * it navigates, clicks, types, and extracts autonomously.
 *
 * Operations:
 *   navigate   — go to URL, return title + status
 *   click      — click a CSS selector
 *   type       — type into a selector
 *   extract    — extract text from matching elements
 *   screenshot — capture page as base64 PNG
 *   ai_goal    — autonomous AI-driven navigation toward a goal
 *
 * The ai_goal operation is unique: it screenshots the page, reads the DOM,
 * asks an LLM what to do next, executes the action, and repeats until done.
 */

import axios from "axios";
import { browserCluster } from "../core/browser.manager.js";
import { resolveCredential } from "../utils/resolveCredential.js";
import { decrypt } from "../utils/crypto.js";
import { redis } from "../infra/redis.client.js";

const AI_GOAL_SYSTEM_PROMPT = `You are a browser automation agent. You see the current page as a screenshot and a list of interactive elements.
Your job is to decide the SINGLE next action to take to achieve the user's goal.
Always respond with valid JSON only:
{
  "action": "click" | "type" | "navigate" | "extract" | "scroll" | "wait" | "done",
  "selector": "<CSS selector, for click/type/extract>",
  "value": "<text to type, for type action>",
  "url": "<URL, for navigate action>",
  "reason": "<why this action>",
  "result": "<extracted text or final answer, for done action>",
  "isDone": true | false
}
Use "done" only when you have achieved the goal or extracted the needed information.
Prefer simple, stable selectors. Do not hallucinate selectors — only use ones visible in the DOM snapshot.`;

async function getDomSnapshot(page) {
  return page.evaluate(() => {
    const interactiveSelectors = "a, button, input, select, textarea, [onclick], [role='button'], [role='link']";
    const elements = Array.from(document.querySelectorAll(interactiveSelectors)).slice(0, 80);

    function getStableSelector(el) {
      if (el.id) return `#${el.id}`;
      if (el.name) return `[name="${el.name}"]`;
      const text = (el.innerText || el.value || el.placeholder || "").trim().slice(0, 30);
      const tag = el.tagName.toLowerCase();
      const type = el.type ? `[type="${el.type}"]` : "";
      return text ? `${tag}${type}` : tag;
    }

    return elements.map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || el.value || el.placeholder || "").trim().slice(0, 60),
      selector: getStableSelector(el),
      href: el.href || null,
      type: el.type || null,
    })).filter((e) => e.text || e.href);
  });
}

async function callLLM(apiKey, provider, model, screenshot, domSnapshot, goal, history) {
  const historyText = history.length
    ? `\nActions taken so far:\n${history.map((h, i) => `${i + 1}. ${h.action}: ${h.reason}`).join("\n")}\n`
    : "";

  const domText = JSON.stringify(domSnapshot.slice(0, 50), null, 2);
  const userContent = `Goal: ${goal}${historyText}\n\nInteractive Elements:\n${domText}`;

  if (provider === "anthropic") {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: model || "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        system: AI_GOAL_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/png", data: screenshot } },
            { type: "text", text: userContent },
          ],
        }],
      },
      {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        timeout: 30000,
      },
    );
    const raw = response.data.content[0].text;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Browser Agent: LLM returned no JSON action.");
    try {
      return JSON.parse(match[0]);
    } catch {
      throw new Error("Browser Agent: LLM returned malformed JSON action.");
    }
  } else {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: model || "gpt-4o-mini",
        max_tokens: 500,
        messages: [
          { role: "system", content: AI_GOAL_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:image/png;base64,${screenshot}`, detail: "low" } },
              { type: "text", text: userContent },
            ],
          },
        ],
        response_format: { type: "json_object" },
      },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 30000 },
    );
    try {
      return JSON.parse(response.data.choices[0].message.content);
    } catch {
      throw new Error("Browser Agent: LLM returned malformed JSON action.");
    }
  }
}

export default {
  timeoutMs: 600_000,
  async run(config, input, context = {}) {
    const {
      operation = "navigate",
      selector,
      value,
      goal,
      provider = "openai",
      model,
      maxSteps = 10,
      sessionId,
      waitFor,
      timeout: pageTimeout = 30000,
    } = config;

    const url = config.url ?? input?.url ?? (typeof input === "string" ? input : null);

    if (operation === "ai_goal") {
      if (!url) return { success: false, error: "Browser Agent: 'url' is required for ai_goal operation — configure this field.", skipped: true };
      if (!goal) return { success: false, error: "Browser Agent: 'goal' is required for ai_goal operation — configure this field.", skipped: true };

      const cred = await resolveCredential(config.credentialId, context.workspaceId, "Browser Agent");
      const apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);

      const steps = [];
      let finalResult = null;

      const outcome = await browserCluster.execute({ url, waitFor }, async ({ page }) => {
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");

        await page.goto(url, { waitUntil: "networkidle2", timeout: parseInt(pageTimeout) });
        if (waitFor) await page.waitForSelector(waitFor, { timeout: 10000 }).catch(() => {});

        let done = false;
        const cappedSteps = Math.min(parseInt(maxSteps) || 10, 15);

        for (let step = 0; step < cappedSteps && !done; step++) {
          const screenshot = await page.screenshot({ encoding: "base64", clip: { x: 0, y: 0, width: 1280, height: 800 } });
          const domSnapshot = await getDomSnapshot(page);

          let action;
          try {
            action = await callLLM(apiKey, provider, model, screenshot, domSnapshot, goal, steps);
          } catch (err) {
            steps.push({ action: "error", reason: err.message, success: false });
            break;
          }

          const stepRecord = { action: action.action, selector: action.selector, value: action.value, url: action.url, reason: action.reason, success: true };

          try {
            if (action.isDone || action.action === "done") {
              finalResult = action.result || action.reason || "Goal completed";
              done = true;
            } else if (action.action === "click" && action.selector) {
              await page.waitForSelector(action.selector, { timeout: 5000 }).catch(() => {});
              await page.click(action.selector).catch((e) => { stepRecord.success = false; stepRecord.error = e.message; });
            } else if (action.action === "type" && action.selector) {
              await page.waitForSelector(action.selector, { timeout: 5000 }).catch(() => {});
              await page.type(action.selector, action.value || "").catch((e) => { stepRecord.success = false; stepRecord.error = e.message; });
            } else if (action.action === "navigate" && action.url) {
              await page.goto(action.url, { waitUntil: "networkidle2", timeout: parseInt(pageTimeout) });
            } else if (action.action === "extract" && action.selector) {
              const items = await page.$$eval(action.selector, (els) => els.map((e) => e.innerText.trim())).catch(() => []);
              finalResult = items.join("\n");
              stepRecord.extracted = items;
            } else if (action.action === "scroll") {
              await page.evaluate(() => window.scrollBy(0, 400));
            } else if (action.action === "wait") {
              await new Promise((r) => setTimeout(r, 1500));
            }
          } catch (err) {
            stepRecord.success = false;
            stepRecord.error = err.message;
          }

          steps.push(stepRecord);
          if (!done) await new Promise((r) => setTimeout(r, 800));
        }

        const finalScreenshot = await page.screenshot({ encoding: "base64", clip: { x: 0, y: 0, width: 1280, height: 800 } });
        return {
          success: done || !!finalResult,
          result: finalResult || "Max steps reached without completing goal",
          finalUrl: page.url(),
          title: await page.title(),
          screenshot: finalScreenshot,
          steps,
          stepCount: steps.length,
          goal,
        };
      });

      // Store session hint in Redis if sessionId provided
      if (sessionId && context.workspaceId) {
        await redis.set(
          `bb:browser:session:${context.workspaceId}:${sessionId}`,
          JSON.stringify({ currentUrl: outcome.finalUrl, lastGoal: goal }),
          "EX", 3600,
        ).catch(() => {});
      }

      return outcome;
    }

    // Non-AI operations — use browserCluster for browser ops
    if (["navigate", "click", "type", "extract", "screenshot"].includes(operation)) {
      if (!url && operation !== "click" && operation !== "type" && operation !== "extract" && operation !== "screenshot") {
        return { success: false, error: "Browser Agent: 'url' is required — configure this field.", skipped: true };
      }

      return browserCluster.execute({ url, selector, value, waitFor, operation, pageTimeout }, async ({ page, data }) => {
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");

        if (data.url) {
          const response = await page.goto(data.url, { waitUntil: "networkidle2", timeout: parseInt(data.pageTimeout) || 30000 });
          if (data.waitFor) await page.waitForSelector(data.waitFor, { timeout: 10000 }).catch(() => {});

          if (data.operation === "navigate") {
            return { url: page.url(), title: await page.title(), httpStatus: response.status() };
          }
        }

        if (data.operation === "click") {
          if (!data.selector) return { success: false, error: "Browser Agent: 'selector' is required for click — configure this field.", skipped: true };
          await page.waitForSelector(data.selector, { timeout: 5000 }).catch(() => {});
          await page.click(data.selector);
          return { clicked: true, selector: data.selector, url: page.url() };
        }

        if (data.operation === "type") {
          if (!data.selector) return { success: false, error: "Browser Agent: 'selector' is required for type — configure this field.", skipped: true };
          await page.waitForSelector(data.selector, { timeout: 5000 }).catch(() => {});
          await page.type(data.selector, data.value || "");
          return { typed: data.value, selector: data.selector, url: page.url() };
        }

        if (data.operation === "extract") {
          if (!data.selector) return { success: false, error: "Browser Agent: 'selector' is required for extract — configure this field.", skipped: true };
          const items = await page.$$eval(data.selector, (els) => els.map((e) => e.innerText.trim()).filter(Boolean));
          return { items, count: items.length, selector: data.selector, url: page.url() };
        }

        if (data.operation === "screenshot") {
          const shot = await page.screenshot({ encoding: "base64" });
          return { screenshot: `data:image/png;base64,${shot}`, url: page.url(), title: await page.title() };
        }

        throw new Error(`Browser Agent: unknown operation "${data.operation}"`);
      });
    }

    throw new Error(`Browser Agent: unknown operation "${operation}"`);
  },
};
