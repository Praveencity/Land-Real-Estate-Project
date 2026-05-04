/**
 * Email utility — uses Resend HTTP API in production (works on Render/Vercel
 * where SMTP ports are blocked) and falls back to nodemailer + Ethereal for
 * local development.
 */
const nodemailer = require("nodemailer");

/**
 * Send an email.
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 */
const sendEmail = async ({ to, subject, text, html }) => {
  // ── Production: use Resend HTTP API (port 443, never blocked) ──
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Land Registry System <onboarding@resend.dev>",
        to,
        subject,
        text,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email via Resend");
    }

    console.log(`📧 Email sent via Resend to ${to} (id: ${data.id})`);
    return data;
  }

  // ── Local dev: use nodemailer with Gmail or Ethereal ──
  let transporter;
  if (process.env.EMAIL_USER && process.env.EMAIL_USER !== "your_gmail@gmail.com") {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      family: 4,
      tls: { rejectUnauthorized: false },
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  const fromAddress =
    process.env.EMAIL_USER && process.env.EMAIL_USER !== "your_gmail@gmail.com"
      ? process.env.EMAIL_USER
      : '"Land Registry System" <noreply@landregistry.local>';

  const info = await transporter.sendMail({ from: fromAddress, to, subject, text, html });

  // Log Ethereal preview URL for local dev
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === "your_gmail@gmail.com") {
    console.log("----------------------------------------");
    console.log("📧 TEST EMAIL SENT! (No real email used)");
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    console.log("----------------------------------------");
  }

  return info;
};

module.exports = sendEmail;
