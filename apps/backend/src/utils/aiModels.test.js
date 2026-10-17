import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AI_MODELS, MODEL_LINEUPS, resolveModel, isRetiredModel,
  shapeOpenAIChatBody, shapeAnthropicBody, isOpenAIReasoningModel,
  openaiChatToolsUnsupported, isGemini3Plus, REASONING_TOKEN_FLOOR,
} from "./aiModels.js";

const day = (iso) => new Date(`${iso}T12:00:00Z`);

test("retired IDs map to their replacement", () => {
  assert.equal(resolveModel("anthropic", "claude-3-5-sonnet-20241022"), "claude-sonnet-5-5");
  assert.equal(resolveModel("openai", "dall-e-3"), "gpt-image-2.5-flare");
  assert.equal(resolveModel("gemini", "gemini-1.5-pro"), "gemini-4-argon");
  assert.equal(resolveModel("gemini", "gemini-3.5-pro"), "gemini-4-argon");
  assert.equal(resolveModel("xai", "grok-beta"), "grok-4.7");
  assert.equal(resolveModel("perplexity", "llama-3-sonar-large-32k-online"), "sonar-pro");
  assert.equal(resolveModel("openrouter", "anthropic/claude-3.5-sonnet"), "anthropic/claude-sonnet-5.5");
});

test("live IDs and unknown IDs pass through untouched", () => {
  assert.equal(resolveModel("anthropic", "claude-sonnet-4-6"), "claude-sonnet-4-6");
  assert.equal(resolveModel("openai", "my-fine-tune:ft-123"), "my-fine-tune:ft-123");
  assert.equal(resolveModel("nope", "whatever"), "whatever");
  assert.equal(resolveModel("openai", undefined), undefined);
  assert.equal(resolveModel("openai", "  gpt-6-luna "), "gpt-6-luna");
});

test("a dated retirement only kicks in on the shutdown day", () => {
  assert.equal(resolveModel("openai", "gpt-4-turbo", { now: day("2026-10-22") }), "gpt-4-turbo");
  assert.equal(resolveModel("openai", "gpt-4-turbo", { now: day("2026-10-23") }), "gpt-5.6-sol");
  assert.equal(resolveModel("deepseek", "deepseek-chat", { now: day("2026-07-23") }), "deepseek-chat");
  assert.equal(resolveModel("deepseek", "deepseek-chat", { now: day("2026-07-24") }), "deepseek-flash");
  assert.equal(isRetiredModel("openai", "gpt-4o-mini", { now: day("2026-10-17") }), false);
});

test("every default and lineup entry is a live ID", () => {
  for (const [provider, roles] of Object.entries(AI_MODELS)) {
    for (const id of Object.values(roles)) assert.equal(resolveModel(provider, id), id, `${provider}:${id}`);
  }
  for (const [provider, ids] of Object.entries(MODEL_LINEUPS)) {
    for (const id of ids) assert.equal(resolveModel(provider, id), id, `${provider}:${id}`);
    assert.equal(new Set(ids).size, ids.length, `${provider} lineup has duplicates`);
  }
});

test("OpenAI reasoning models get max_completion_tokens and lose sampling params", () => {
  const body = shapeOpenAIChatBody({ model: "gpt-6.1-sol", temperature: 0.7, top_p: 0.9, max_tokens: 2000, messages: [] });
  assert.equal(body.max_tokens, undefined);
  assert.equal(body.max_completion_tokens, REASONING_TOKEN_FLOOR);
  assert.equal(body.temperature, undefined);
  assert.equal(body.top_p, undefined);
});

test("OpenAI non-reasoning models keep their params", () => {
  const body = shapeOpenAIChatBody({ model: "gpt-4o-mini", temperature: 0.7, max_tokens: 2000 });
  assert.deepEqual(body, { model: "gpt-4o-mini", temperature: 0.7, max_tokens: 2000 });
  assert.equal(isOpenAIReasoningModel("gpt-5.3-chat-latest"), false);
  assert.equal(isOpenAIReasoningModel("o4-mini"), true);
});

test("GPT-6 Sol/Luna with tools run at effort none and keep temperature", () => {
  const body = shapeOpenAIChatBody({ model: "gpt-6-sol", temperature: 0.3, max_tokens: 1000, tools: [{ type: "function", function: { name: "x" } }] });
  assert.equal(body.reasoning_effort, "none");
  assert.equal(body.temperature, 0.3);
  assert.equal(body.max_completion_tokens, 1000);
});

test("GPT-6 Astra never gets effort none or minimal", () => {
  assert.equal(shapeOpenAIChatBody({ model: "gpt-6-astra", reasoning_effort: "none" }).reasoning_effort, "low");
  assert.equal(shapeOpenAIChatBody({ model: "gpt-6.1-sol", reasoning_effort: "minimal" }).reasoning_effort, "low");
  assert.equal(openaiChatToolsUnsupported("gpt-6-astra"), true);
  assert.equal(openaiChatToolsUnsupported("gpt-6-sol"), false);
});

test("Claude 5-family drops sampling params and budget thinking", () => {
  const body = shapeAnthropicBody({
    model: "claude-opus-5-5", max_tokens: 4000, temperature: 0.7, top_p: 0.9, top_k: 5,
    thinking: { type: "enabled", budget_tokens: 8000 },
  });
  assert.equal(body.temperature, undefined);
  assert.equal(body.top_p, undefined);
  assert.equal(body.top_k, undefined);
  assert.deepEqual(body.thinking, { type: "adaptive", display: "summarized" });
  assert.equal(body.max_tokens, REASONING_TOKEN_FLOOR);
});

test("Claude Opus 4.8 drops sampling but keeps a small cap when not thinking", () => {
  const body = shapeAnthropicBody({ model: "claude-opus-4-8", max_tokens: 2000, temperature: 0 });
  assert.equal(body.temperature, undefined);
  assert.equal(body.max_tokens, 2000);
});

test("older Claude models are left alone", () => {
  const original = { model: "claude-haiku-4-5", max_tokens: 1000, temperature: 0.2, thinking: { type: "enabled", budget_tokens: 2000 } };
  assert.deepEqual(shapeAnthropicBody({ ...original }), original);
});

test("forced tool choice becomes auto plus an instruction on models that reject it", () => {
  const body = shapeAnthropicBody({ model: "claude-sonnet-5-5", max_tokens: 2000, system: "Be brief.", tool_choice: { type: "tool", name: "respond" } });
  assert.deepEqual(body.tool_choice, { type: "auto" });
  assert.match(body.system, /Be brief\.\n\nRespond by calling the `respond` tool\./);
  const haiku = shapeAnthropicBody({ model: "claude-haiku-5-5", max_tokens: 2000, tool_choice: { type: "any" } });
  assert.deepEqual(haiku.tool_choice, { type: "any" });
});

test("disabled thinking is dropped where it cannot be disabled", () => {
  assert.equal(shapeAnthropicBody({ model: "claude-fable-5-1", max_tokens: 100, thinking: { type: "disabled" } }).thinking, undefined);
  assert.deepEqual(shapeAnthropicBody({ model: "claude-sonnet-5", max_tokens: 100, thinking: { type: "disabled" } }).thinking, { type: "disabled" });
});

test("Gemini 3+ detection", () => {
  assert.equal(isGemini3Plus("gemini-3.8-flash"), true);
  assert.equal(isGemini3Plus("gemini-4-argon"), true);
  assert.equal(isGemini3Plus("models/gemini-3.1-pro-preview"), true);
  assert.equal(isGemini3Plus("gemini-2.5-flash"), false);
});
