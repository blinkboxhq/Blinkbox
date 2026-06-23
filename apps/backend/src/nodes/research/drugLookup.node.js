import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input) {
    const name = config.name || config.drug || input?.name || input?.drug;
    if (!name) return { success: false, error: "drug_lookup: 'name' is required.", skipped: true };
    const res = await axios.get("https://api.fda.gov/drug/label.json", {
      params: { search: `openfda.brand_name:"${name}" OR openfda.generic_name:"${name}"`, limit: 1 },
      timeout: TIMEOUT,
    });
    const result = res.data.results?.[0];
    if (!result) return { found: false, name };
    const of = result.openfda || {};
    return {
      found: true,
      brandName: of.brand_name?.[0],
      genericName: of.generic_name?.[0],
      manufacturer: of.manufacturer_name?.[0],
      route: of.route?.[0],
      substance: of.substance_name?.[0],
      purpose: result.purpose?.[0]?.substring(0, 300),
      warnings: result.warnings?.[0]?.substring(0, 500),
    };
  },
};
