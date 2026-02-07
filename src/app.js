const express = require("express");
const cors = require("cors");
const path = require("path");

const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/orders");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// ✅ SERVE IMAGES FIRST
app.use("/images", express.static(path.join(__dirname, "../public/images")));

// Login details and Signup details
app.use("/api/auth", require("./routes/auth.routes"));

// routes
app.use("/api/cart", cartRoutes);

// health check
app.get("/", (req, res) => {
  res.send("API running");

app.use("/api/orders", orderRoutes);

});

module.exports = app;
