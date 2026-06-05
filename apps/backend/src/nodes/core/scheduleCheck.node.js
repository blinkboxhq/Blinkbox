export default {
  async run(config, input) {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();

    const allowedDays = config.days ? config.days.map(Number) : [0, 1, 2, 3, 4, 5, 6];
    const startHour = parseInt(config.startHour ?? 0);
    const endHour = parseInt(config.endHour ?? 23);
    const timezone = config.timezone || "UTC";

    const inDay = allowedDays.includes(day);
    const inHour = hour >= startHour && hour <= endHour;
    const isActive = inDay && inHour;

    return { isActive, day, hour, minute, timezone, currentTime: now.toISOString(), ...input };
  },
};
