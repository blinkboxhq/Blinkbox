import axios from "axios";
import { getOAuthToken } from "../../../apps/backend/src/utils/getOAuthToken.js";

export default {
  async run(config, input) {
    if (input?.responses) return input;
    const token = await getOAuthToken(config.credentialId, config.workspaceId, "Google Forms");
    const formId = config.formId;
    if (!formId) throw new Error("[google_forms_trigger] formId is required");
    const [formRes, respRes] = await Promise.all([
      axios.get(`https://forms.googleapis.com/v1/forms/${formId}`, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }),
      axios.get(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
        params: { pageSize: Math.min(config.maxResults || 10, 200), ...(config.afterTimestamp ? { filter: `submit_time > ${config.afterTimestamp}` } : {}) },
        headers: { Authorization: `Bearer ${token}` }, timeout: 15000,
      }),
    ]);
    const form = formRes.data;
    const questions = {};
    (form?.items ?? []).forEach(item => {
      if (item?.questionItem) questions[item.itemId] = item.title;
      if (item?.questionGroupItem) item.questionGroupItem.questions?.forEach(q => { questions[q.questionId] = q.rowQuestion?.title || item.title; });
    });
    const responses = (respRes.data?.responses ?? []).map(r => {
      const answers = {};
      Object.entries(r?.answers ?? {}).forEach(([qId, ans]) => {
        const key = questions[qId] || qId;
        answers[key] = ans?.textAnswers?.answers?.map(a => a.value)?.join(", ") || ans?.fileUploadAnswers?.answers?.map(a => a.fileId)?.join(", ");
      });
      return { responseId: r.responseId, email: r.respondentEmail, submitTime: r.lastSubmittedTime, answers };
    });
    return { formId, formTitle: form?.info?.title, totalResponses: respRes.data?.responses?.length ?? 0, responses, latestResponse: responses[0] ?? null, triggeredAt: new Date().toISOString() };
  },
};
