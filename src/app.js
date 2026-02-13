const express = require("express");
const cors = require("cors");
const path = require("path");

const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/orders");
const authRoutes = require("./routes/auth.routes");
const razorpayWebhook = require("./routes/razorpayWebhook");

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

/* =========================
   WEBHOOK RAW BODY
========================= */
app.use(
  "/api/webhooks/razorpay",
  express.raw({ type: "application/json" })
);

/* =========================
   JSON Middleware
========================= */
app.use(express.json());

/* =========================
   Static Files
========================= */
app.use("/images", express.static(path.join(__dirname, "../public/images")));

/* =========================
   Routes
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/webhooks/razorpay", razorpayWebhook);

/* =========================
   Health Check
========================= */
app.get("/", (req, res) => {
  res.send("API running");
});

module.exports = app;
