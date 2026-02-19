import nodemailer from "nodemailer";
export const sendEmail = async (to, subject, html, attachments) => {
    // Validate email credentials
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    if (!emailUser || !emailPass) {
        throw new Error(`Email configuration missing: EMAIL_USER=${!!emailUser}, EMAIL_PASS=${!!emailPass}`);
    }
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });
        const mailOptions = {
            from: `"Sauna Booking" <${emailUser}>`,
            to,
            subject,
            html,
        };
        if (attachments && attachments.length > 0) {
            mailOptions.attachments = attachments;
        }
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${to}`);
    }
    catch (error) {
        console.error('❌ Failed to send email:', {
            to,
            subject,
            error: error.message,
            stack: error.stack
        });
        throw new Error(`Email sending failed: ${error.message}`);
    }
};
//# sourceMappingURL=sendEmail.js.map