
const nodemailer = require("nodemailer");
require("dotenv").config();

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
    });

    return await transporter.sendMail({
      from: `"Clothing Store" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text
    });

  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};

module.exports = sendEmail;
