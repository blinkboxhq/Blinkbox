export default {
  async run(config, input) {
    const leaderboard = Array.isArray(config.leaderboard || input?.leaderboard) ? (config.leaderboard || input?.leaderboard) : [];
    const userId = config.userId || input?.userId;
    const score = parseFloat(config.score ?? input?.score ?? 0);
    const name = config.name || input?.name || userId;

    const existing = leaderboard.find((e) => e.userId === userId);
    let updated;
    if (existing) {
      updated = leaderboard.map((e) => e.userId === userId ? { ...e, score: e.score + score, name } : e);
    } else {
      updated = [...leaderboard, { userId, name, score, joinedAt: new Date().toISOString() }];
    }
    const ranked = [...updated].sort((a, b) => b.score - a.score).map((e, i) => ({ ...e, rank: i + 1 }));
    const userEntry = ranked.find((e) => e.userId === userId);
    return { leaderboard: ranked, userEntry, totalPlayers: ranked.length };
  },
};
