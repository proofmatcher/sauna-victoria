import nodemailer from "nodemailer";

export const sendEmail = async (to: string, subject: string, html: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // your gmail
      pass: process.env.EMAIL_PASS, // app password
    },
  });

  const mailOptions = {
    from: `"Sauna Booking" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};
