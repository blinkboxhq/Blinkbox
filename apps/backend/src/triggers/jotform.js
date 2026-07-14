export default {
  async run(config, input) {
    const b = input?.body ?? input ?? {};

    let raw = {};
    if (typeof b.rawRequest === "string") {
      try { raw = JSON.parse(b.rawRequest); } catch { raw = {}; }
    } else if (b.rawRequest && typeof b.rawRequest === "object") {
      raw = b.rawRequest;
    }

    const fields = {};
    for (const [key, value] of Object.entries(raw)) {
      if (key.startsWith("event_") || key === "slider" || key === "temp_upload") continue;
      fields[key.replace(/^q\d+_/, "")] = value;
    }

    return {
      formId:       b.formID       ?? config.formId ?? "",
      formTitle:    b.formTitle    ?? "",
      submissionId: b.submissionID ?? "",
      submittedAt:  new Date().toISOString(),
      ip:           b.ip           ?? null,
      pretty:       b.pretty       ?? null,
      fields,
      raw,
    };
  },
};
