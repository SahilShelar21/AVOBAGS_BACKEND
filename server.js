require("dotenv").config();
const app = require("./src/app");

const PORT = process.env.PORT || 5000;

/* =========================
   SECURITY CHECK
========================= */
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing in ENV");
  process.exit(1);
}

if (!process.env.RAZORPAY_KEY_ID) {
  console.error("❌ RAZORPAY_KEY_ID missing in ENV");
  process.exit(1);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
