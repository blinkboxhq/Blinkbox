import axios from "axios";

const TIMEOUT = 15000;

export default {
  async run(config, input) {
    const query = config.query || input?.query;
    if (!query) return { success: false, error: "clinical_trials: 'query' is required.", skipped: true };
    const maxResults = parseInt(config.maxResults || 10);
    const res = await axios.get("https://clinicaltrials.gov/api/v2/studies", {
      params: { query: { cond: query }, pageSize: maxResults, format: "json" },
      timeout: TIMEOUT,
    });
    const studies = (res.data.studies || []).map((s) => {
      const p = s.protocolSection;
      return {
        nctId: p?.identificationModule?.nctId,
        title: p?.identificationModule?.briefTitle,
        status: p?.statusModule?.overallStatus,
        phase: p?.designModule?.phases?.join(", "),
        condition: p?.conditionsModule?.conditions?.join(", "),
        sponsor: p?.sponsorCollaboratorsModule?.leadSponsor?.name,
        startDate: p?.statusModule?.startDateStruct?.date,
      };
    });
    return { results: studies, count: studies.length, query };
  },
};
