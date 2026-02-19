import nodemailer from "nodemailer";

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export const sendEmail = async (
  to: string, 
  subject: string, 
  html: string, 
  attachments?: EmailAttachment[]
) => {
  // Email configuration
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpSecure = process.env.SMTP_SECURE === "true"; // true for 465, false for other ports
  
  if (!emailUser) {
    throw new Error("Email configuration missing: EMAIL_USER is required");
  }

  try {
    let transporter;

    if (smtpHost) {
      // SMTP Relay configuration (for Google Workspace SMTP Relay or other SMTP servers)
      const transportConfig: any = {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure, // true for 465, false for 587
      };

      // If password is provided, use authentication
      // If not, assume IP-based authentication (for SMTP relay with IP whitelisting)
      if (emailPass) {
        transportConfig.auth = {
          user: emailUser,
          pass: emailPass,
        };
      }

      // For Google Workspace SMTP Relay
      if (smtpHost.includes("gmail.com") || smtpHost.includes("google.com")) {
        transportConfig.tls = {
          rejectUnauthorized: false
        };
      }

      transporter = nodemailer.createTransport(transportConfig);
      console.log(`📧 Using SMTP Relay: ${smtpHost}:${smtpPort} (secure: ${smtpSecure})`);
    } else {
      // Fallback to Gmail service (requires App Password)
      if (!emailPass) {
        throw new Error("Email configuration missing: Either SMTP_HOST or EMAIL_PASS is required");
      }

      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
      console.log("📧 Using Gmail service with App Password");
    }

    const mailOptions: any = {
      from: `"Victoria Sauna Rentals" <${emailUser}>`,
      to,
      subject,
      html,
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error: any) {
    console.error('❌ Failed to send email:', {
      to,
      subject,
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Email sending failed: ${error.message}`);
  }
};
