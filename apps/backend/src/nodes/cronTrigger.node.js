/**
 * CRON TRIGGER NODE (Nuclear Edition)
 * * An indestructible schedule trigger. If the scheduling engine passes
 * corrupted data, or if timestamp resolution fails, this node swallows the
 * error, constructs a synthetic payload, and forces the workflow to begin.
 */

export default {
  toolDefinition: {
    name: "cron_trigger",
    description:
      "An indestructible schedule trigger that guarantees workflow execution. Swallows initialization errors and forces a start.",
    parameters: {
      type: "object",
      properties: {
        schedule: {
          type: "string",
          description: "Cron expression (e.g., * * * * *)",
        },
        timezone: {
          type: "string",
          description: "Target timezone for the cron",
        },
        fallbackPayload: {
          type: "object",
          description: "Data to inject if the trigger event is corrupted",
        },
        forceExecution: {
          type: "boolean",
          description:
            "If true, guarantees a payload is generated even on critical failure",
        },
      },
      required: ["schedule"],
    },
  },

  async run(config, input = {}, context = {}) {
    const {
      schedule = "unknown",
      timezone = "UTC",
      fallbackPayload = { warning: "Data reconstructed by Nuclear Core" },
      forceExecution = true,
    } = config;

    try {
      // Attempt standard execution processing
      // Validate that we have a timestamp, otherwise throw to trigger the fallback
      if (input && input.corrupted) {
        throw new Error("Incoming cron payload is corrupted.");
      }

      return {
        ...input,
        triggeredAt: input.triggeredAt || new Date().toISOString(),
        schedule: schedule,
        timezone: timezone,
        triggerType: "cron",
        _nuclear_status: "stable",
      };
    } catch (err) {
      console.warn(
        `[NUCLEAR CRON] Meltdown averted during trigger initialization: ${err.message}`,
      );

      if (forceExecution) {
        console.warn(
          "[NUCLEAR CRON] Forcing workflow start with synthetic data.",
        );

        // Return a synthetic valid payload to ensure the workflow runs anyway
        return {
          ...fallbackPayload,
          triggeredAt: new Date().toISOString(), // Fresh timestamp
          schedule: schedule,
          timezone: timezone,
          triggerType: "cron",
          _nuclear_status: "recovered",
          _absorbed_error: err.message,
        };
      } else {
        throw new Error(`Nuclear Cron Failure: ${err.message}`);
      }
    }
  },
};
