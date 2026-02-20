export default {
  async run(config, context) {
    const message = config?.message || "Log node executed";

    console.log("🧾 LOG NODE:", message);

    return {
      log: message,
    };
  },
};
