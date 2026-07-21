import { test } from "node:test";
import assert from "node:assert/strict";

// The provider calls themselves are network; what is testable — and what
// actually breaks silently — is the param shaping, response coercion and the
// operation map the config panels promise the picker.
const openai = await import("./_packaged/openai/GenericFunctions.js");
const anthropic = await import("./_packaged/anthropic/GenericFunctions.js");
const gemini = await import("./_packaged/gemini/GenericFunctions.js");

// ── sampling params ──────────────────────────────────────────────────────────

test("openai omits unset sampling params instead of sending nulls", () => {
  assert.deepEqual(openai.samplingParams({}), {});
  assert.deepEqual(openai.samplingParams({ temperature: "", topP: "", seed: "" }), {});
});

test("openai coerces sampling params to numbers and caps stop sequences at 4", () => {
  const p = openai.samplingParams({
    temperature: "0.7", maxTokens: "512", topP: "0.9",
    frequencyPenalty: "0.1", presencePenalty: "0.2", seed: "42",
    stop: "a\nb\n\nc\nd\ne", user: "u1",
  });
  assert.deepEqual(p, {
    temperature: 0.7, max_tokens: 512, top_p: 0.9,
    frequency_penalty: 0.1, presence_penalty: 0.2, seed: 42,
    stop: ["a", "b", "c", "d"], user: "u1",
  });
});

test("openai keeps a zero temperature, which is a falsy value worth sending", () => {
  assert.deepEqual(openai.samplingParams({ temperature: 0 }), { temperature: 0 });
});

test("anthropic falls back to per-operation defaults for temperature", () => {
  assert.deepEqual(anthropic.samplingParams({}, { temperature: 0.3 }), { temperature: 0.3 });
  assert.deepEqual(anthropic.samplingParams({ temperature: 1 }, { temperature: 0.3 }), { temperature: 1 });
});

test("anthropic uses the Messages API names, not the OpenAI ones", () => {
  const p = anthropic.samplingParams({ temperature: 0.5, topP: 0.9, topK: 40, stop: "END\nSTOP" });
  assert.deepEqual(p, { temperature: 0.5, top_p: 0.9, top_k: 40, stop_sequences: ["END", "STOP"] });
});

test("gemini uses camelCase generationConfig keys and allows 5 stop sequences", () => {
  const gen = gemini.generationConfig({ temperature: 0.4, maxTokens: 800, topP: 0.8, topK: 20, stop: ["a", "b", "c", "d", "e", "f"] });
  assert.deepEqual(gen, {
    temperature: 0.4, maxOutputTokens: 800, topP: 0.8, topK: 20,
    stopSequences: ["a", "b", "c", "d", "e"],
  });
});

test("gemini drops an empty stop list rather than sending stopSequences: []", () => {
  assert.deepEqual(gemini.generationConfig({ stop: "\n  \n" }), {});
});

// ── response coercion ────────────────────────────────────────────────────────

test("maybeJson unwraps a fenced json block so users get an object, not a string", () => {
  for (const [name, fn] of [["anthropic", anthropic.maybeJson], ["gemini", gemini.maybeJson]]) {
    assert.deepEqual(fn('{"a":1}'), { a: 1 }, name);
    assert.deepEqual(fn('```json\n{"a":1}\n```'), { a: 1 }, name);
    assert.equal(fn("just prose"), "just prose", name);
  }
});

test("inputSummary passes strings through and truncates large objects", () => {
  for (const [name, fn] of [["openai", openai.inputSummary], ["anthropic", anthropic.inputSummary], ["gemini", gemini.inputSummary]]) {
    assert.equal(fn("hello"), "hello", name);
    assert.equal(fn({ a: 1 }), '{\n  "a": 1\n}', name);
    assert.equal(fn({ a: "x".repeat(50000) }).length, 15000, name);
  }
});

// ── error mapping ────────────────────────────────────────────────────────────

test("openai turns HTTP status codes into something a non-engineer can act on", () => {
  const cases = [
    [401, /Invalid API key/],
    [403, /check your API key permissions/],
    [429, /Quota exceeded/],
    [503, /Server error \(503\)/],
  ];
  for (const [status, re] of cases) {
    assert.throws(() => openai.handleError({ message: "x", response: { status } }), re, String(status));
  }
});

test("openai error mapping carries the provider name for reskinned endpoints", () => {
  assert.throws(
    () => openai.handleError({ message: "x", response: { status: 401 } }, "Moonshot"),
    /^Error: Moonshot: Invalid API key\.$/,
  );
});

test("anthropic names the offending model on a 404 instead of a bare not-found", () => {
  assert.throws(
    () => anthropic.handleError({ message: "x", config: { data: JSON.stringify({ model: "claude-nope" }) }, response: { status: 404 } }),
    /Model "claude-nope" not found/,
  );
  assert.throws(
    () => anthropic.handleError({ message: "x", config: { data: "not json" }, response: { status: 404 } }),
    /Model "unknown" not found/,
  );
});

test("error wrappers do not re-wrap a message they already produced", () => {
  const openaiErr = new Error("OpenAI: already friendly");
  assert.throws(() => openai.handleError(openaiErr), (thrown) => thrown === openaiErr);

  const anthropicErr = new Error("Anthropic: already friendly");
  assert.throws(() => anthropic.handleError(anthropicErr), (thrown) => thrown === anthropicErr);
});

// ── router contracts ─────────────────────────────────────────────────────────

const AI_PACKAGES = [
  "openai", "anthropic", "gemini", "perplexity", "xai", "deepseek",
  "nvidiaNim", "moonshot", "openrouter", "zai", "minimax", "sakana",
];

test("every AI provider router exposes a callable operation map with a valid default", async () => {
  for (const name of AI_PACKAGES) {
    const mod = await import(`./_packaged/${name}/router.js`);
    assert.ok(Object.keys(mod.OPERATIONS ?? {}).length > 0, `${name} has no operations`);
    assert.ok(
      mod.OPERATIONS[mod.DEFAULT_OPERATION],
      `${name} default '${mod.DEFAULT_OPERATION}' is not one of its operations`,
    );
    for (const [op, handler] of Object.entries(mod.OPERATIONS)) {
      assert.equal(typeof handler, "function", `${name}.${op} is not callable`);
    }
  }
});

test("every AI provider router handles an unknown operation instead of crashing", async () => {
  for (const name of AI_PACKAGES) {
    const mod = await import(`./_packaged/${name}/router.js`);
    let out;
    try {
      out = await mod.run({ operation: "definitelyNotAnOperation" }, "fake-key");
    } catch (err) {
      assert.match(err.message, /nknown operation|not.*found/i, name);
      continue;
    }
    assert.equal(out?.skipped ?? out?.success === false, true, `${name} silently accepted an unknown operation`);
  }
});
