import axios from "axios";

export default {
  async run(config, payload = {}) {
    if (!config || typeof config !== "object") {
      throw new Error("Webhook config must be an object");
    }

    const { url, method = "POST", headers = {} } = config;

    if (!url) {
      throw new Error("Webhook URL is required");
    }

    try {
      const response = await axios({
        url,
        method,
        data: payload,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        timeout: 10_000,
      });

      console.log("🌐 WEBHOOK EXECUTED", response.status);

      return {
        success: true,
        status: response.status,
      };
    } catch (err) {
      console.error("❌ WEBHOOK ERROR:", err.message);

      throw new Error(
        `Webhook failed: ${err.response?.status || "NO_RESPONSE"}`,
      );
    }
  },
};
