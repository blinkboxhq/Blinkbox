export default {
  backendType: "drug_lookup",
  label: "Drug Lookup",
  description: "Query FDA drug database (openFDA)",
  fields: [
    {
      name: "searchBy", label: "Search By", type: "options", cols: 3, default: "name",
      options: [
        { value: "name", label: "Drug Name" },
        { value: "ndc", label: "NDC Code" },
        { value: "application_number", label: "App Number" },
      ],
    },
    { name: "query", label: "Search Value", type: "string", smart: true, placeholder: "aspirin" },
    {
      name: "infoFields", label: "Fields to Return", type: "multiOptions",
      default: ["brand_name", "generic_name", "dosage_form", "route", "warnings", "indications_and_usage"],
      options: [
        { value: "brand_name", label: "Brand Name" },
        { value: "generic_name", label: "Generic Name" },
        { value: "dosage_form", label: "Dosage Form" },
        { value: "route", label: "Route" },
        { value: "indications_and_usage", label: "Indications" },
        { value: "warnings", label: "Warnings" },
        { value: "contraindications", label: "Contraindications" },
        { value: "adverse_reactions", label: "Adverse Reactions" },
        { value: "drug_interactions", label: "Drug Interactions" },
        { value: "dosage_and_administration", label: "Dosage & Admin" },
        { value: "manufacturer_name", label: "Manufacturer" },
      ],
    },
    { type: "notice", variant: "info", text: "Powered by openFDA API — no API key required" },
  ],
  outputs: ["brand_name", "generic_name", "dosage_form", "route"],
};
