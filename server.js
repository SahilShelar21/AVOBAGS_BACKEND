require("dotenv").config();
const app = require("./src/app");

const PORT = process.env.PORT || 5000;

/* =========================
   ENV VALIDATION
========================= */

const requiredEnv = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
];

requiredEnv.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`❌ ${envVar} is missing in ENV`);
    process.exit(1);
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
