import crypto from "crypto";

export default {
  async run(config, input) {
    const type = config.type || "debit";
    const amount = parseFloat(config.amount ?? input?.amount ?? 0);
    const description = config.description || input?.description || "";
    const category = config.category || "general";
    const ledger = Array.isArray(input?.ledger) ? input.ledger : [];

    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      type, amount, description, category,
      date: config.date || new Date().toISOString(),
    };

    const updated = [...ledger, entry];
    const balance = updated.reduce((acc, e) => acc + (e.type === "credit" ? e.amount : -e.amount), 0);
    const totalCredits = updated.filter((e) => e.type === "credit").reduce((a, e) => a + e.amount, 0);
    const totalDebits = updated.filter((e) => e.type === "debit").reduce((a, e) => a + e.amount, 0);

    return { entry, ledger: updated, balance: Math.round(balance * 100) / 100, totalCredits, totalDebits };
  },
};
