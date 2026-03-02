const express = require("express");
const cors = require("cors");
const path = require("path");

const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/orders");

const app = express();

/* =========================
   TRUST PROXY (Render Safe)
========================= */
app.set("trust proxy", 1);

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: [
      "https://avobags-frontend-v1.onrender.com",
      "http://localhost:5173"
    ],
    credentials: true
  })
);

/* =====================================================
   🔥 WEBHOOK RAW BODY (MUST COME BEFORE express.json())
===================================================== */
// 1️⃣ Webhook FIRST
app.use("/api/webhook/razorpay", require("./routes/razorpayWebhook"));

// 2️⃣ Then JSON middleware
app.use(express.json());

/* =========================
   JSON Middleware (FOR ALL OTHER ROUTES)
========================= */
app.use(express.json());

/* =========================
   STATIC FILES
========================= */
app.use(
  "/images",
  express.static(path.join(__dirname, "../public/images"))
);

/* =========================
   ROUTES
========================= */
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.status(200).send("✅ API running");
});

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

module.exports = app;
