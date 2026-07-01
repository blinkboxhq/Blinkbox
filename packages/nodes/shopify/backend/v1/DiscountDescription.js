/**
 * Shopify — Discounts / Price Rules.
 */
import { need, enc, lim } from "../GenericFunctions.js";

async function opListPriceRules(c, { api }) {
  const r = await api.get("/price_rules.json", { params: { limit: lim(c.limit, 20) } });
  return { success: true, data: r.data.price_rules ?? [], count: r.data.price_rules?.length ?? 0 };
}
async function opCreatePriceRule(c, { api }) {
  let e = need(c, "title", "createPriceRule"); if (e) return e;
  e = need(c, "value", "createPriceRule"); if (e) return e;
  const price_rule = {
    title: c.title,
    target_type: "line_item", target_selection: "all", allocation_method: "across",
    value_type: c.valueType || "percentage",
    value: `-${Math.abs(Number(c.value))}`,
    customer_selection: "all",
    starts_at: c.startsAt || new Date().toISOString(),
  };
  const r = await api.post("/price_rules.json", { price_rule });
  return { success: true, ...r.data.price_rule };
}
async function opCreateDiscountCode(c, { api }) {
  let e = need(c, "priceRuleId", "createDiscountCode"); if (e) return e;
  e = need(c, "code", "createDiscountCode"); if (e) return e;
  const r = await api.post(`/price_rules/${enc(c.priceRuleId)}/discount_codes.json`, { discount_code: { code: c.code } });
  return { success: true, ...r.data.discount_code };
}

export const discountOperations = {
  listPriceRules: opListPriceRules, createPriceRule: opCreatePriceRule, createDiscountCode: opCreateDiscountCode,
};
