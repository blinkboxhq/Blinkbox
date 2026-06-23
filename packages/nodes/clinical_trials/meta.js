export default {
  backendType: "clinical_trials",
  label: "Clinical Trials Search",
  description: "Query ClinicalTrials.gov database",
  fields: [
    { name: "query", label: "Search Query", type: "string", smart: true, placeholder: "cancer immunotherapy" },
    { name: "condition", label: "Condition / Disease (optional)", type: "string", smart: true, placeholder: "Type 2 Diabetes" },
    {
      name: "status", label: "Recruitment Status", type: "options", cols: 2, default: "",
      options: [
        { value: "", label: "Any" },
        { value: "RECRUITING", label: "Recruiting" },
        { value: "ACTIVE_NOT_RECRUITING", label: "Active (not recruiting)" },
        { value: "COMPLETED", label: "Completed" },
        { value: "NOT_YET_RECRUITING", label: "Not Yet Recruiting" },
        { value: "TERMINATED", label: "Terminated" },
      ],
    },
    {
      name: "phase", label: "Phase", type: "options", cols: 3, default: "",
      options: [
        { value: "", label: "Any" },
        { value: "EARLY_PHASE1", label: "Early Phase 1" },
        { value: "PHASE1", label: "Phase 1" },
        { value: "PHASE2", label: "Phase 2" },
        { value: "PHASE3", label: "Phase 3" },
        { value: "PHASE4", label: "Phase 4" },
      ],
    },
    { name: "maxResults", label: "Max Results", type: "number", min: 1, max: 50, default: 10 },
  ],
  outputs: ["trials", "count", "NCTId", "title", "status", "phase"],
};
