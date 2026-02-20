export default {
  async run(config, payload = {}) {
    if (!config || typeof config !== "object") {
      throw new Error("Email config must be an object");
    }

    let { to, subject, body } = config;

    if (!to || !subject || !body) {
      throw new Error("Email config incomplete: to, subject, body required");
    }

    // 🧠 Variable interpolation {{key}}
    for (const [key, value] of Object.entries(payload)) {
      body = body.replaceAll(`{{${key}}}`, String(value));
      subject = subject.replaceAll(`{{${key}}}`, String(value));
    }

    console.log("📧 EMAIL ACTION EXECUTED");
    console.log({ to, subject, body });

    return {
      success: true,
      message: `Email successfully sent to ${to}`,
    };
  },
};
