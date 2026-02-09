const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_EMAIL_APP_PASSWORD,
  },
});

module.exports = async function sendEmail({ to, subject, html }) {
  await transporter.sendMail({
    from: `"AVOBAGS" <${process.env.ADMIN_EMAIL}>`,
    to,
    subject,
    html,
  });
};
