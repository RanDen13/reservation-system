import nodemailer from "nodemailer";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(to: string, subject: string, text: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || process.env.SENDER_EMAIL;
  const pass = process.env.SMTP_PASSWORD || process.env.SENDER_PASSWORD;
  const senderEmail = process.env.SENDER_EMAIL || user;
  const senderName = process.env.SENDER_NAME || "LCUP Venue Reservation";

  if (!host || !port || !user || !pass || !senderEmail) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[dev email fallback]", { to, subject, text });
      return true;
    }

    console.error("Incomplete SMTP settings.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === "true"
        : port === 465,
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      text,
      html: `<p>${escapeHtml(text).replace(/\n/g, "<br />")}</p>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}
