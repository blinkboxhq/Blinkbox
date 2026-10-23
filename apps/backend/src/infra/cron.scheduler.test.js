import { test, describe } from "node:test";
import assert from "node:assert/strict";

// cron.scheduler.js pulls config/env.js, which loads apps/backend/.env for any
// variable not already set. Pin everything it could reach to local values first.
process.env.JWT_SECRET ||= "test-jwt-secret";
process.env.ENCRYPTION_KEY ||= "0123456789abcdef0123456789abcdef";
process.env.REDIS_URL = "redis://127.0.0.1:6390";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/blinkbox-test";
process.env.MONGO_URI = process.env.MONGODB_URI;
process.env.DEFAULT_TIMEZONE = "Asia/Kolkata";

const parser = (await import("cron-parser")).default;
const {
  resolveSchedule,
  schedulerIdFor,
  desiredSchedulers,
  reconcileSchedulers,
  removeLegacyRepeatables,
  slotMillisOf,
  createCronProcessor,
} = await import("./cron.scheduler.js");
const { getTriggerConfig, getTriggerNodesOfType } = await import("./triggerNodes.util.js");

const NOW = Date.parse("2026-10-23T06:00:00.000Z");
const silent = { log() {}, warn() {}, error() {} };

const cronNode = (id, data) => ({ id, type: "cron_trigger", data: { triggerVariant: "cron", ...data } });
const automation = (id, nodes, extra = {}) => ({
  _id: id,
  name: `auto ${id}`,
  active: true,
  workspaceId: "ws1",
  nodes,
  triggerNodes: nodes.filter((n) => n.type === "cron_trigger").map((n) => ({ nodeId: n.id, type: "cron_trigger" })),
  ...extra,
});

function fakeQueue({ schedulers = [], repeatables = [], jobStates = {} } = {}) {
  const state = new Map(schedulers.map((s) => [s.key, { ...s }]));
  const calls = { upsert: [], remove: [], getJob: [], removeRepeatable: [] };
  return {
    calls,
    state,
    async getJobSchedulers() {
      return [...state.values()];
    },
    async upsertJobScheduler(id, repeat, template) {
      calls.upsert.push({ id, repeat, template });
      state.set(id, { key: id, name: template.name, pattern: repeat.pattern, tz: repeat.tz, next: NOW + 60_000 });
    },
    async removeJobScheduler(id) {
      calls.remove.push(id);
      state.delete(id);
    },
    async getJob(id) {
      calls.getJob.push(id);
      const jobState = jobStates[id];
      return jobState ? { getState: async () => jobState } : undefined;
    },
    async getRepeatableJobs() {
      return repeatables;
    },
    async removeRepeatableByKey(key) {
      calls.removeRepeatable.push(key);
    },
  };
}

describe("resolveSchedule", () => {
  test("maps every interval preset the panel offers", () => {
    const expected = {
      every_minute: "* * * * *",
      every_5m: "*/5 * * * *",
      every_15m: "*/15 * * * *",
      every_30m: "*/30 * * * *",
      every_hour: "0 * * * *",
      every_6h: "0 */6 * * *",
      every_12h: "0 */12 * * *",
    };
    for (const [preset, pattern] of Object.entries(expected)) {
      assert.deepEqual(resolveSchedule({ preset, timezone: "UTC" }), { pattern, tz: "UTC" }, preset);
    }
  });

  test("daily honours hour and minute", () => {
    assert.deepEqual(
      resolveSchedule({ preset: "daily", dailyHour: "09", dailyMinute: "30", timezone: "Asia/Kolkata" }),
      { pattern: "30 9 * * *", tz: "Asia/Kolkata" },
    );
    assert.equal(resolveSchedule({ preset: "daily", dailyHour: "00", dailyMinute: "00" }).pattern, "0 0 * * *");
    assert.equal(resolveSchedule({ preset: "daily", dailyHour: "23", dailyMinute: "59" }).pattern, "59 23 * * *");
    assert.equal(resolveSchedule({ preset: "daily", dailyHour: 7, dailyMinute: 5 }).pattern, "5 7 * * *");
  });

  test("daily without hour or minute runs at 09:00", () => {
    assert.equal(resolveSchedule({ preset: "daily" }).pattern, "0 9 * * *");
    assert.equal(resolveSchedule({ preset: "daily", dailyHour: "", dailyMinute: " " }).pattern, "0 9 * * *");
  });

  test("weekly honours days, hour and minute", () => {
    assert.equal(
      resolveSchedule({ preset: "weekly", dailyHour: "18", dailyMinute: "05", selectedDays: ["Mon", "Wed", "Fri"] }).pattern,
      "5 18 * * 1,3,5",
    );
    assert.equal(resolveSchedule({ preset: "weekly" }).pattern, "0 9 * * 1,2,3,4,5");
    assert.equal(resolveSchedule({ preset: "weekly", selectedDays: "sat, SUN" }).pattern, "0 9 * * 6,0");
  });

  test("weekly with every day switched off matches the panel preview (every day)", () => {
    assert.equal(resolveSchedule({ preset: "weekly", selectedDays: [] }).pattern, "0 9 * * *");
  });

  test("custom uses the expression with whitespace collapsed", () => {
    assert.equal(resolveSchedule({ preset: "custom", customCron: "  0   8 * * 1-5 " }).pattern, "0 8 * * 1-5");
    assert.equal(resolveSchedule({ preset: "custom", schedule: "15 * * * *" }).pattern, "15 * * * *");
    assert.equal(resolveSchedule({ preset: "custom" }).pattern, "0 * * * *");
  });

  test("a preset wins over a schedule string that fell out of sync", () => {
    assert.equal(resolveSchedule({ preset: "every_5m", schedule: "0 9 * * *" }).pattern, "*/5 * * * *");
    assert.equal(resolveSchedule({ preset: "daily", dailyHour: "14", schedule: "0 9 * * *" }).pattern, "0 14 * * *");
  });

  test("configs without a preset fall back to schedule, cronExpression, then the automation setting", () => {
    assert.equal(resolveSchedule({ schedule: "*/10 * * * *" }).pattern, "*/10 * * * *");
    assert.equal(resolveSchedule({ cronExpression: "0 7 * * *" }).pattern, "0 7 * * *");
    assert.equal(resolveSchedule({}, { settings: { cronExpression: "0 6 * * *" } }).pattern, "0 6 * * *");
    assert.equal(resolveSchedule({}).pattern, "0 * * * *");
    assert.equal(resolveSchedule(undefined).pattern, "0 * * * *");
  });

  test("without a timezone it uses DEFAULT_TIMEZONE", () => {
    assert.equal(resolveSchedule({ preset: "every_hour" }).tz, "Asia/Kolkata");
    assert.equal(resolveSchedule({ preset: "every_hour", timezone: "" }).tz, "Asia/Kolkata");
  });

  test("the Daily disk report starter template runs at 09:00 in its own timezone", () => {
    const data = { triggerVariant: "cron", preset: "daily", dailyHour: "09", dailyMinute: "00", timezone: "Europe/London", schedule: "0 9 * * *" };
    const resolved = resolveSchedule(getTriggerConfig({ data }));
    assert.deepEqual(resolved, { pattern: "0 9 * * *", tz: "Europe/London" });
    const next = parser.parseExpression(resolved.pattern, { tz: resolved.tz, currentDate: new Date(NOW) }).next().toDate();
    assert.equal(next.toISOString(), "2026-10-23T08:00:00.000Z");
  });

  test("the next slot is computed in the configured timezone, not UTC", () => {
    const resolved = resolveSchedule({ preset: "daily", dailyHour: "09", dailyMinute: "00", timezone: "Asia/Kolkata" });
    const next = parser.parseExpression(resolved.pattern, { tz: resolved.tz, currentDate: new Date("2026-10-23T00:00:00Z") }).next().toDate();
    assert.equal(next.toISOString(), "2026-10-23T03:30:00.000Z");
  });

  test("invalid expressions and timezones come back as errors, never throws", () => {
    assert.match(resolveSchedule({ preset: "custom", customCron: "not a cron" }).error, /invalid cron "not a cron"/);
    assert.match(resolveSchedule({ preset: "daily", dailyHour: "09", dailyMinute: "75" }).error, /invalid cron "75 9 \* \* \*"/);
    assert.match(resolveSchedule({ preset: "every_hour", timezone: "Mars/Olympus" }).error, /unknown timezone "Mars\/Olympus"/);
  });
});

test("schedulerIdFor keeps the id at three colon-separated parts", () => {
  assert.equal(schedulerIdFor("a1", "n1"), "cron:a1:n1");
  assert.equal(schedulerIdFor("a1", "n:1:x"), "cron:a1:n_1_x");
});

describe("desiredSchedulers", () => {
  test("one entry per valid cron node, invalid ones skipped with a warning", () => {
    const warnings = [];
    const log = { ...silent, warn: (msg) => warnings.push(msg) };
    const desired = desiredSchedulers(
      [
        automation("a1", [
          cronNode("n1", { preset: "daily", dailyHour: "08", dailyMinute: "15", timezone: "UTC" }),
          cronNode("n2", { preset: "custom", customCron: "nope" }),
          { id: "n3", type: "http_request", data: {} },
        ]),
        automation("a2", [cronNode("t", { preset: "every_5m", timezone: "Asia/Tokyo" })]),
      ],
      log,
    );
    assert.deepEqual([...desired.keys()], ["cron:a1:n1", "cron:a2:t"]);
    assert.deepEqual(desired.get("cron:a1:n1"), {
      id: "cron:a1:n1", automationId: "a1", nodeId: "n1", name: "auto a1", pattern: "15 8 * * *", tz: "UTC",
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /node n2: invalid cron "nope"/);
  });

  test("falls back to entryNodeId when the automation has no triggerNodes", () => {
    const legacy = {
      _id: "a3",
      name: "legacy",
      entryNodeId: "start",
      nodes: [{ id: "start", type: "cron_trigger", data: { schedule: "0 6 * * *" } }],
    };
    assert.deepEqual([...desiredSchedulers([legacy], silent).values()].map((d) => [d.id, d.pattern, d.tz]), [
      ["cron:a3:start", "0 6 * * *", "Asia/Kolkata"],
    ]);
  });
});

describe("reconcileSchedulers", () => {
  const twoAutomations = (patternA = "daily") => desiredSchedulers(
    [
      automation("a1", [cronNode("n1", { preset: patternA, timezone: "UTC" })]),
      automation("a2", [cronNode("n1", { preset: "every_hour", timezone: "Asia/Kolkata" })]),
    ],
    silent,
  );

  test("first pass schedules every node with its pattern, timezone and payload", async () => {
    const queue = fakeQueue();
    const result = await reconcileSchedulers(queue, twoAutomations(), { now: NOW, log: silent });
    assert.deepEqual(result, { upserted: ["cron:a1:n1", "cron:a2:n1"], removed: [], unchanged: [] });
    assert.deepEqual(queue.calls.upsert[0].repeat, { pattern: "0 9 * * *", tz: "UTC" });
    assert.equal(queue.calls.upsert[0].template.name, "cron-fire");
    assert.deepEqual(queue.calls.upsert[0].template.data, { automationId: "a1", nodeId: "n1" });
    assert.deepEqual(queue.calls.upsert[1].repeat, { pattern: "0 * * * *", tz: "Asia/Kolkata" });
  });

  test("an unchanged schedule is left alone so its next slot is never reset", async () => {
    const queue = fakeQueue();
    await reconcileSchedulers(queue, twoAutomations(), { now: NOW, log: silent });
    queue.calls.upsert.length = 0;
    const result = await reconcileSchedulers(queue, twoAutomations(), { now: NOW, log: silent });
    assert.deepEqual(result, { upserted: [], removed: [], unchanged: ["cron:a1:n1", "cron:a2:n1"] });
    assert.equal(queue.calls.upsert.length, 0);
    assert.equal(queue.calls.getJob.length, 0);
  });

  test("only the edited schedule is upserted", async () => {
    const queue = fakeQueue();
    await reconcileSchedulers(queue, twoAutomations(), { now: NOW, log: silent });
    queue.calls.upsert.length = 0;
    const result = await reconcileSchedulers(queue, twoAutomations("every_5m"), { now: NOW, log: silent });
    assert.deepEqual(result.upserted, ["cron:a1:n1"]);
    assert.deepEqual(result.unchanged, ["cron:a2:n1"]);
    assert.deepEqual(queue.calls.upsert[0].repeat, { pattern: "*/5 * * * *", tz: "UTC" });
  });

  test("a timezone change alone is an edit", async () => {
    const queue = fakeQueue({ schedulers: [{ key: "cron:a1:n1", pattern: "0 9 * * *", tz: "Asia/Kolkata", next: NOW + 1000 }] });
    const desired = desiredSchedulers([automation("a1", [cronNode("n1", { preset: "daily", timezone: "UTC" })])], silent);
    const result = await reconcileSchedulers(queue, desired, { now: NOW, log: silent });
    assert.deepEqual(result.upserted, ["cron:a1:n1"]);
  });

  test("schedulers with no matching node are removed", async () => {
    const queue = fakeQueue();
    await reconcileSchedulers(queue, twoAutomations(), { now: NOW, log: silent });
    const onlyA2 = desiredSchedulers([automation("a2", [cronNode("n1", { preset: "every_hour", timezone: "Asia/Kolkata" })])], silent);
    const result = await reconcileSchedulers(queue, onlyA2, { now: NOW, log: silent });
    assert.deepEqual(result.removed, ["cron:a1:n1"]);
    assert.deepEqual([...queue.state.keys()], ["cron:a2:n1"]);
  });

  test("a scoped sync touches only that automation", async () => {
    const queue = fakeQueue();
    await reconcileSchedulers(queue, twoAutomations(), { now: NOW, log: silent });
    const result = await reconcileSchedulers(queue, new Map(), { automationId: "a1", now: NOW, log: silent });
    assert.deepEqual(result, { upserted: [], removed: ["cron:a1:n1"], unchanged: [] });
    assert.deepEqual([...queue.state.keys()], ["cron:a2:n1"]);
  });

  test("a scoped sync does not match automations whose id merely starts the same", async () => {
    const queue = fakeQueue({ schedulers: [{ key: "cron:a10:n1", pattern: "0 * * * *", tz: "UTC", next: NOW + 1000 }] });
    const result = await reconcileSchedulers(queue, new Map(), { automationId: "a1", now: NOW, log: silent });
    assert.deepEqual(result.removed, []);
  });

  test("keys outside the cron: namespace are not reconciled", async () => {
    const queue = fakeQueue({ schedulers: [{ key: "cron-fire:legacy-hash", pattern: "0 9 * * *", next: NOW + 1000 }] });
    const result = await reconcileSchedulers(queue, new Map(), { now: NOW, log: silent });
    assert.deepEqual(result.removed, []);
  });

  test("an overdue slot whose job is gone or finished is re-upserted", async () => {
    const overdue = NOW - 3 * 60_000;
    for (const jobState of [undefined, "completed", "failed", "unknown"]) {
      const key = "cron:a1:n1";
      const queue = fakeQueue({
        schedulers: [{ key, pattern: "0 9 * * *", tz: "UTC", next: overdue }],
        jobStates: jobState ? { [`repeat:${key}:${overdue}`]: jobState } : {},
      });
      const desired = desiredSchedulers([automation("a1", [cronNode("n1", { preset: "daily", timezone: "UTC" })])], silent);
      const result = await reconcileSchedulers(queue, desired, { now: NOW, log: silent });
      assert.deepEqual(result.upserted, [key], String(jobState));
      assert.deepEqual(queue.calls.getJob, [`repeat:${key}:${overdue}`]);
    }
  });

  test("an overdue slot still queued (catch-up after downtime) is left to fire", async () => {
    const overdue = NOW - 3 * 60_000;
    for (const jobState of ["delayed", "waiting", "active", "prioritized"]) {
      const key = "cron:a1:n1";
      const queue = fakeQueue({
        schedulers: [{ key, pattern: "0 9 * * *", tz: "UTC", next: overdue }],
        jobStates: { [`repeat:${key}:${overdue}`]: jobState },
      });
      const desired = desiredSchedulers([automation("a1", [cronNode("n1", { preset: "daily", timezone: "UTC" })])], silent);
      const result = await reconcileSchedulers(queue, desired, { now: NOW, log: silent });
      assert.deepEqual(result.unchanged, [key], jobState);
      assert.equal(queue.calls.upsert.length, 0);
    }
  });

  test("a slot only just due is not probed", async () => {
    const key = "cron:a1:n1";
    const queue = fakeQueue({ schedulers: [{ key, pattern: "0 9 * * *", tz: "UTC", next: NOW - 30_000 }] });
    const desired = desiredSchedulers([automation("a1", [cronNode("n1", { preset: "daily", timezone: "UTC" })])], silent);
    const result = await reconcileSchedulers(queue, desired, { now: NOW, log: silent });
    assert.deepEqual(result.unchanged, [key]);
    assert.equal(queue.calls.getJob.length, 0);
  });
});

test("removeLegacyRepeatables drops only the old repeat keys", async () => {
  const legacyKey = "cron-fire:cron-a1-n1:::0 9 * * *";
  const queue = fakeQueue({ repeatables: [{ key: legacyKey }, { key: "cron:a1:n1" }, {}] });
  assert.equal(await removeLegacyRepeatables(queue, silent), 1);
  assert.deepEqual(queue.calls.removeRepeatable, [legacyKey]);
});

test("slotMillisOf reads the slot from the scheduler job id", () => {
  assert.equal(slotMillisOf({ id: "repeat:cron:a1:n1:1792735200000" }), 1792735200000);
  assert.equal(slotMillisOf({ id: "custom", opts: { prevMillis: 123 } }), 123);
  assert.equal(slotMillisOf({ id: "custom", timestamp: 1000, opts: { delay: 500 } }), 1500);
});

describe("createCronProcessor", () => {
  const SLOT = Date.parse("2026-10-23T03:30:00.000Z");
  const dailyNine = cronNode("n1", { preset: "daily", dailyHour: "09", dailyMinute: "00", timezone: "Asia/Kolkata" });
  const job = (extra = {}) => ({
    id: `repeat:cron:a1:n1:${SLOT}`,
    data: { automationId: "a1", nodeId: "n1" },
    opts: { repeat: { pattern: "0 9 * * *", tz: "Asia/Kolkata" } },
    ...extra,
  });

  function harness(loaded) {
    const fired = [];
    const resynced = [];
    const process = createCronProcessor({
      loadAutomation: async () => loaded,
      fire: async (...args) => { fired.push(args); },
      resync: (id) => resynced.push(id),
      now: () => SLOT + 250,
      log: silent,
    });
    return { process, fired, resynced };
  }

  test("fires with the slot time, lateness and a per-slot idempotency key", async () => {
    const a1 = automation("a1", [dailyNine]);
    const { process, fired, resynced } = harness(a1);
    assert.deepEqual(await process(job()), { slot: SLOT, lateMs: 250 });
    assert.equal(fired.length, 1);
    const [firedAutomation, payload, options] = fired[0];
    assert.equal(firedAutomation, a1);
    assert.deepEqual(payload, {
      triggeredAt: "2026-10-23T03:30:00.000Z",
      firedAt: "2026-10-23T03:30:00.250Z",
      lateMs: 250,
      schedule: "0 9 * * *",
      timezone: "Asia/Kolkata",
      triggerType: "cron",
    });
    assert.deepEqual(options, { workspaceId: "ws1", entryNodeId: "n1", idempotencyKey: `cron-a1-n1-${SLOT}` });
    assert.deepEqual(resynced, []);
  });

  test("an inactive or deleted automation drops its schedule instead of running", async () => {
    for (const loaded of [null, automation("a1", [dailyNine], { active: false })]) {
      const { process, fired, resynced } = harness(loaded);
      assert.deepEqual(await process(job()), { skipped: "inactive" });
      assert.equal(fired.length, 0);
      assert.deepEqual(resynced, ["a1"]);
    }
  });

  test("a removed trigger node drops its schedule", async () => {
    const { process, fired, resynced } = harness(automation("a1", [cronNode("other", { preset: "every_hour" })]));
    assert.deepEqual(await process(job()), { skipped: "node-gone" });
    assert.equal(fired.length, 0);
    assert.deepEqual(resynced, ["a1"]);
  });

  test("a slot from a replaced pattern or timezone is skipped and resynced", async () => {
    for (const repeat of [{ pattern: "0 8 * * *", tz: "Asia/Kolkata" }, { pattern: "0 9 * * *", tz: "UTC" }]) {
      const { process, fired, resynced } = harness(automation("a1", [dailyNine]));
      assert.deepEqual(await process(job({ opts: { repeat } })), { skipped: "stale" });
      assert.equal(fired.length, 0);
      assert.deepEqual(resynced, ["a1"]);
    }
  });

  test("whitespace differences in the stored pattern are not staleness", async () => {
    const { process, fired } = harness(automation("a1", [dailyNine]));
    await process(job({ opts: { repeat: { pattern: "0  9 * * *", tz: "Asia/Kolkata" } } }));
    assert.equal(fired.length, 1);
  });

  test("jobs left by the old scheduler (triggerNodeId, no repeat opts) still fire", async () => {
    const { process, fired } = harness(automation("a1", [dailyNine]));
    const result = await process({ id: "repeat:abc123:1792735200000", data: { automationId: "a1", triggerNodeId: "n1" }, opts: {} });
    assert.deepEqual(result, { slot: 1792735200000, lateMs: SLOT + 250 - 1792735200000 });
    assert.equal(fired[0][2].entryNodeId, "n1");
  });
});

describe("getTriggerConfig", () => {
  test("flat fields win over a legacy nested config", () => {
    const node = { data: { preset: "daily", dailyHour: "10", config: { preset: "every_hour", dailyHour: "09", timezone: "Asia/Tokyo" } } };
    assert.deepEqual(getTriggerConfig(node), { preset: "daily", dailyHour: "10", timezone: "Asia/Tokyo" });
  });

  test("drops the canvas role marker that legacy nodes keep in data.type", () => {
    const node = { data: { type: "trigger", config: { preset: "every_hour" } } };
    assert.deepEqual(getTriggerConfig(node), { preset: "every_hour" });
  });

  test("returns flat data untouched and copes with empty nodes", () => {
    const data = { preset: "weekly", selectedDays: ["Mon"] };
    assert.equal(getTriggerConfig({ data }), data);
    assert.deepEqual(getTriggerConfig({}), {});
    assert.deepEqual(getTriggerConfig(undefined), {});
  });
});

describe("getTriggerNodesOfType", () => {
  test("uses declared triggerNodes when present", () => {
    const a = automation("a1", [cronNode("n1", {}), cronNode("n2", {})]);
    a.triggerNodes = [{ nodeId: "n2", type: "cron_trigger" }, { nodeId: "missing", type: "cron_trigger" }, { nodeId: "n1", type: "webhook" }];
    assert.deepEqual(getTriggerNodesOfType(a, "cron_trigger").map((n) => n.id), ["n2"]);
  });

  test("without triggerNodes, recognises the entry node and flattened trigger nodes", () => {
    const a = {
      entryNodeId: "entry",
      nodes: [
        { id: "entry", type: "cron_trigger", data: {} },
        { id: "flat", type: "cron_trigger", data: { triggerVariant: "cron" } },
        { id: "nested", data: { backendType: "cron_trigger", config: { triggerVariant: "cron" } } },
        { id: "marked", type: "cron_trigger", data: { type: "trigger" } },
        { id: "stray", type: "cron_trigger", data: {} },
        { id: "hook", type: "webhook", data: { triggerVariant: "webhook" } },
      ],
    };
    assert.deepEqual(getTriggerNodesOfType(a, "cron_trigger").map((n) => n.id), ["entry", "flat", "nested", "marked"]);
  });
});
