export default {
  async run(config, input) {
    const key = config.key;
    if (!key) return { success: false, error: "env_variable: 'key' is required.", skipped: true };
    const blocked = ["DATABASE_URL", "MONGODB_URI", "JWT_SECRET", "ENCRYPTION_KEY", "REDIS_URL"];
    if (blocked.some((b) => key.toUpperCase().includes(b.split("_")[0]))) {
      throw new Error(`env_variable: access to "${key}" is not allowed.`);
    }
    const value = process.env[key] ?? config.defaultValue ?? null;
    return { key, value, exists: value !== null };
  },
};
