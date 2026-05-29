export default {
  async run(config) {
    let ms = config.ms;
    if (!ms && config.amount != null) {
      const multipliers = { seconds: 1000, minutes: 60000, hours: 3600000 };
      ms = (parseFloat(config.amount) || 0) * (multipliers[config.unit] ?? 1000);
    }
    ms = ms ?? 1000;
    return {
      __delay: true,
      resumeAfter: Date.now() + ms,
    };
  },
};
