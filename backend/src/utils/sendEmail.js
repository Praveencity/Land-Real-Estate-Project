/**
 * Email utility — uses Brevo (Sendinblue) HTTP API in production (works on
 * Render/Vercel where SMTP ports are blocked) and falls back to nodemailer +
 * Ethereal for local development.
 */
const nodemailer = require("nodemailer");

/**
 * Send an email.
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 */
const sendEmail = async ({ to, subject, text, html }) => {



  // ── Local dev: use nodemailer with Gmail or Ethereal ──
  try {
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
  } catch (err) {
    console.error("Critical: Email service failed completely.", err.message);
    console.log("----------------------------------------");
    console.log("⚠️  EMAIL DELIVERY FAILED. Check server console for OTP/Links.");
    console.log("----------------------------------------");
    return { message: "Delivery failed but proceeding for local testing" };
  }
};

module.exports = sendEmail;
