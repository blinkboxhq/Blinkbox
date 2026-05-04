import nodemailer from "nodemailer";

export default {
  async run(config, input, context = {}) {
    const { to, subject, body, smtpConfig } = config;

    if (!to || !subject || !body) {
      return { success: false, error: "Send Email: 'to', 'subject', and 'body' are required.", skipped: true };
    }

    if (!smtpConfig || !smtpConfig.user || !smtpConfig.pass) {
      throw new Error(
        "Send Email: Gmail account and App Password are required.",
      );
    }

    // Initialize the Nodemailer transport for Gmail
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host || "smtp.gmail.com",
      port: smtpConfig.port || 465,
      secure: true,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    try {
      // Fire the email
      const info = await transporter.sendMail({
        from: `"BlinkBox Engine" <${smtpConfig.user}>`,
        to: to,
        subject: subject,
        text: body,
      });

      return {
        success: true,
        messageId: info.messageId,
        deliveredTo: to,
        content: body,
      };
    } catch (error) {
      throw new Error(`Email Delivery Failed: ${error.message}`);
    }
  },
};
