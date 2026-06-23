export default {
  async run(config, input) {
    const country = (config.country || input?.country || "US").toUpperCase();
    const rates = {
      US: { vat: 0, corporateTax: 21, incomeTaxTop: 37, note: "No federal VAT; state sales tax 0-10%" },
      GB: { vat: 20, corporateTax: 25, incomeTaxTop: 45, note: "UK standard VAT 20%" },
      DE: { vat: 19, corporateTax: 15, incomeTaxTop: 45, note: "Germany" },
      FR: { vat: 20, corporateTax: 25, incomeTaxTop: 45, note: "France" },
      IN: { vat: 18, corporateTax: 22, incomeTaxTop: 30, note: "India GST standard rate" },
      AU: { vat: 10, corporateTax: 30, incomeTaxTop: 45, note: "Australia GST" },
      CA: { vat: 5, corporateTax: 15, incomeTaxTop: 33, note: "Canada federal GST; provinces add 0-10%" },
      SG: { vat: 9, corporateTax: 17, incomeTaxTop: 22, note: "Singapore GST" },
      JP: { vat: 10, corporateTax: 23.2, incomeTaxTop: 45, note: "Japan consumption tax" },
      AE: { vat: 5, corporateTax: 9, incomeTaxTop: 0, note: "UAE — no personal income tax" },
    };
    const data = rates[country];
    if (!data) return { country, found: false, note: "Country not in lookup table. Check OECD for rates." };
    return { country, ...data, found: true };
  },
};
