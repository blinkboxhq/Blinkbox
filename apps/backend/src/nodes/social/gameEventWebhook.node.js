export default {
  async run(config, input) {
    const body = input?.body ?? input;
    return {
      event: body?.event || body?.type || "unknown",
      playerId: body?.playerId || body?.player_id,
      gameId: body?.gameId || body?.game_id,
      data: body?.data || body,
      timestamp: body?.timestamp || new Date().toISOString(),
      triggerType: "game_event",
    };
  },
};
