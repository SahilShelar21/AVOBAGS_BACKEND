const express = require("express");
const cors = require("cors");
const path = require("path");

const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/orders");
const authRoutes = require("./routes/auth.routes");

const app = express();

// CORS
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://avobags-frontend-v1.onrender.com"
  ],
  credentials: true
}));

// middleware
app.use(express.json());

// Serve images
app.use("/images", express.static(path.join(__dirname, "../public/images")));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

// health check
app.get("/", (req, res) => {
  res.send("API running");
});

module.exports = app;
