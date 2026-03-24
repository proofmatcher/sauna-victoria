import nodemailer from "nodemailer";
export const sendEmail = async (to, subject, html, attachments) => {
    // Email configuration
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpSecure = process.env.SMTP_SECURE === "true"; // true for 465, false for other ports
    console.log('📧 Email Configuration Check:', {
        hasEmailUser: !!emailUser,
        hasEmailPass: !!emailPass,
        smtpHost: smtpHost || 'NOT_SET',
        smtpPort,
        smtpSecure,
        to,
        subject
    });
    if (!emailUser) {
        const error = "Email configuration missing: EMAIL_USER is required";
        console.error('❌ Email Config Error:', error);
        throw new Error(error);
    }
    try {
        let transporter;
        if (smtpHost) {
            // SMTP Relay configuration (for Google Workspace SMTP Relay or other SMTP servers)
            const transportConfig = {
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
                console.log(`📧 Using SMTP Relay with authentication: ${smtpHost}:${smtpPort}`);
            }
            else {
                console.log(`📧 Using SMTP Relay without auth (IP-based): ${smtpHost}:${smtpPort}`);
            }
            // For Google Workspace SMTP Relay
            if (smtpHost.includes("gmail.com") || smtpHost.includes("google.com")) {
                transportConfig.tls = {
                    rejectUnauthorized: false
                };
            }
            transporter = nodemailer.createTransport(transportConfig);
            console.log(`📧 SMTP Relay configured: ${smtpHost}:${smtpPort} (secure: ${smtpSecure})`);
            // Verify SMTP connection
            try {
                await transporter.verify();
                console.log('✅ SMTP connection verified successfully');
            }
            catch (verifyError) {
                console.error('❌ SMTP verification failed:', {
                    error: verifyError.message,
                    code: verifyError.code,
                    command: verifyError.command
                });
                throw new Error(`SMTP connection failed: ${verifyError.message}`);
            }
        }
        else {
            // Fallback to Gmail service (requires App Password)
            if (!emailPass) {
                const error = "Email configuration missing: Either SMTP_HOST or EMAIL_PASS is required";
                console.error('❌ Email Config Error:', error);
                throw new Error(error);
            }
            transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: emailUser,
                    pass: emailPass,
                },
            });
            console.log("📧 Using Gmail service with App Password");
            // Verify Gmail connection
            try {
                await transporter.verify();
                console.log('✅ Gmail connection verified successfully');
            }
            catch (verifyError) {
                console.error('❌ Gmail verification failed:', {
                    error: verifyError.message,
                    code: verifyError.code
                });
                throw new Error(`Gmail connection failed: ${verifyError.message}`);
            }
        }
        const mailOptions = {
            from: `"Victoria Mobile Sauna Rentals" <${emailUser}>`,
            to,
            subject,
            html,
        };
        if (attachments && attachments.length > 0) {
            mailOptions.attachments = attachments;
        }
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${to}`, {
            messageId: info.messageId,
            response: info.response
        });
    }
    catch (error) {
        console.error('❌ Failed to send email:', {
            to,
            subject,
            error: error.message,
            code: error.code,
            command: error.command,
            responseCode: error.responseCode,
            stack: error.stack
        });
        // Provide more specific error messages
        let errorMessage = `Email sending failed: ${error.message}`;
        if (error.code === 'EAUTH') {
            errorMessage = 'Email authentication failed. Check EMAIL_USER and EMAIL_PASS credentials.';
        }
        else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            errorMessage = 'Email server connection failed. Check SMTP_HOST and firewall settings.';
        }
        else if (error.code === 'EENVELOPE') {
            errorMessage = 'Invalid email address format.';
        }
        throw new Error(errorMessage);
    }
};
//# sourceMappingURL=sendEmail.js.map