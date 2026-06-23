export default {
  async run(config, input) {
    const b = input?.body ?? input;
    const r = b?.form_response ?? b;

    const answers = (r.answers ?? []).map((ans) => {
      const base = { field: ans.field?.ref ?? ans.field?.id, type: ans.type };
      switch (ans.type) {
        case "text":          return { ...base, value: ans.text };
        case "email":         return { ...base, value: ans.email };
        case "number":        return { ...base, value: ans.number };
        case "boolean":       return { ...base, value: ans.boolean };
        case "choice":        return { ...base, value: ans.choice?.label };
        case "choices":       return { ...base, value: ans.choices?.labels ?? [] };
        case "date":          return { ...base, value: ans.date };
        case "file_upload":   return { ...base, value: ans.file_url };
        case "url":           return { ...base, value: ans.url };
        case "phone_number":  return { ...base, value: ans.phone_number };
        case "long_text":     return { ...base, value: ans.text };
        default:              return { ...base, value: ans[ans.type] ?? null };
      }
    });

    return {
      formId:       b?.form_id        ?? "",
      formTitle:    r.definition?.title ?? "",
      token:        r.token           ?? "",
      submittedAt:  r.submitted_at    ?? new Date().toISOString(),
      landedAt:     r.landed_at       ?? null,
      answers,
      variables:    r.variables       ?? [],
      hidden:       r.hidden          ?? {},
      formResponse: r,
    };
  },
};
