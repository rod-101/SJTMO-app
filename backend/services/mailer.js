const nodemailer = require("nodemailer");

function buildTransport() {
  if (process.env.SMTP_HOST) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    });
    // Non-fatal: surfaces a misconfigured relay at boot instead of on first send.
    transport.verify().then(
      () => console.log("[mailer] SMTP transport verified"),
      (err) => console.error("[mailer] SMTP transport verification failed:", err.message),
    );
    return transport;
  }
  // Dev fallback: no SMTP configured, log the email instead of sending it.
  return {
    sendMail: async (opts) => {
      console.log("[DEV EMAIL]", { to: opts.to, subject: opts.subject, text: opts.text });
      return opts;
    },
  };
}

const transport = buildTransport();

async function sendMail(opts) {
  return transport.sendMail({
    from: process.env.SMTP_FROM || "no-reply@sjtmo.local",
    ...opts,
  });
}

module.exports = { sendMail };
