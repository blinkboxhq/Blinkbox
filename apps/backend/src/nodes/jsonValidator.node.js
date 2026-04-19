import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true });

export default {
  async run(config) {
    let schema = config.schema;
    if (typeof schema === "string") {
      try { schema = JSON.parse(schema); } catch { throw new Error("JSON Validator: 'schema' is not valid JSON."); }
    }
    if (!schema || typeof schema !== "object") throw new Error("JSON Validator: 'schema' is required.");

    let data = config.data;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { /* treat as plain string */ }
    }

    let validate;
    try {
      validate = ajv.compile(schema);
    } catch (err) {
      throw new Error(`JSON Validator: Invalid schema — ${err.message}`);
    }

    const valid = validate(data);
    const errors = valid ? [] : (validate.errors || []).map((e) => `${e.instancePath || "/"} ${e.message}`);

    if (!valid && config.failMode !== "continue") {
      throw new Error(`JSON Validator: Validation failed — ${errors[0]}`);
    }

    return { valid, data, errors, errorCount: errors.length };
  },
};
