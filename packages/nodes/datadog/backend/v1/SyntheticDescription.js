/**
 * Datadog — Synthetics.
 */
import { need } from "../GenericFunctions.js";

async function opListSyntheticTests(config, { v1 }) {
  const { data } = await v1.get("/synthetics/tests");
  return { success: true, tests: data.tests, count: data.tests?.length || 0 };
}

async function opGetSyntheticTest(config, { v1 }) {
  const e = need(config, "testId", "getSyntheticTest"); if (e) return e;
  const { data } = await v1.get(`/synthetics/tests/${encodeURIComponent(config.testId)}`);
  return { success: true, ...data };
}

async function opTriggerSyntheticTest(config, { v1 }) {
  const e = need(config, "testId", "triggerSyntheticTest"); if (e) return e;
  const { data } = await v1.post("/synthetics/tests/trigger", { tests: [{ public_id: config.testId }] });
  return { success: true, ...data };
}

export const syntheticOperations = {
  listSyntheticTests: opListSyntheticTests,
  getSyntheticTest: opGetSyntheticTest,
  triggerSyntheticTest: opTriggerSyntheticTest,
};
