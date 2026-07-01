/**
 * Datadog — operation router. Merges every v1 resource map into one dispatch
 * table and runs the selected op. Handlers receive `(config, requester)` where
 * `requester` is `{ v1, v2, site, headers }` built by the backend entry via
 * makeRequester with the resolved API key + Application key.
 */
import { handleError } from "./GenericFunctions.js";
import { metricOperations } from "./v1/MetricDescription.js";
import { eventOperations } from "./v1/EventDescription.js";
import { monitorOperations } from "./v1/MonitorDescription.js";
import { logOperations } from "./v1/LogDescription.js";
import { dashboardOperations } from "./v1/DashboardDescription.js";
import { downtimeOperations } from "./v1/DowntimeDescription.js";
import { hostOperations } from "./v1/HostDescription.js";
import { sloOperations } from "./v1/SloDescription.js";
import { incidentOperations } from "./v1/IncidentDescription.js";
import { syntheticOperations } from "./v1/SyntheticDescription.js";
import { tagOperations } from "./v1/TagDescription.js";
import { userOperations } from "./v1/UserDescription.js";
import { serviceCheckOperations } from "./v1/ServiceCheckDescription.js";

export const OPERATIONS = {
  ...metricOperations,
  ...eventOperations,
  ...monitorOperations,
  ...logOperations,
  ...dashboardOperations,
  ...downtimeOperations,
  ...hostOperations,
  ...sloOperations,
  ...incidentOperations,
  ...syntheticOperations,
  ...tagOperations,
  ...userOperations,
  ...serviceCheckOperations,
};

export const DEFAULT_OPERATION = "submitMetric";

export async function run(config, requester) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Datadog: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, requester);
  } catch (err) {
    handleError(err);
  }
}
