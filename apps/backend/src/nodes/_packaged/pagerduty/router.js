/**
 * PagerDuty — operation router. Merges every v1 resource map into one dispatch
 * table. REST ops receive `(config, { api })`; Events API ops (EVENT_OPS) need
 * no auth and receive `(config)` — the entry passes `null` as the requester for
 * those and the router calls them with config only.
 */
import { handleError } from "./GenericFunctions.js";
import { incidentOperations } from "./v1/IncidentDescription.js";
import { serviceOperations } from "./v1/ServiceDescription.js";
import { scheduleOperations } from "./v1/ScheduleDescription.js";
import { directoryOperations } from "./v1/DirectoryDescription.js";
import { eventOperations, EVENT_OP_NAMES } from "./v1/EventDescription.js";

export const OPERATIONS = {
  ...incidentOperations,
  ...serviceOperations,
  ...scheduleOperations,
  ...directoryOperations,
  ...eventOperations,
};

export const EVENT_OPS = new Set(EVENT_OP_NAMES);
export const DEFAULT_OPERATION = "listIncidents";

export async function run(config, req) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `PagerDuty: Unknown operation "${op}".`, skipped: true };
  try {
    return EVENT_OPS.has(op) ? await handler(config) : await handler(config, req);
  } catch (err) {
    handleError(err);
  }
}
