export default {
  async run(config) {
    const { ms = 1000 } = config;

    return {
      __delay: true,
      resumeAfter: Date.now() + ms,
    };
  },
};
