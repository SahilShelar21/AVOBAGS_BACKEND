const express = require("express");
const router = express.Router();

const { createOrder } = require("../controllers/order.controller");
const auth = require("../middleware/auth");
const db = require("../config/db");

// Create order (COD / Online)
router.post("/create", createOrder);

// Get my orders
router.get("/my-orders", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT id, total_amount, payment_status, payment_method, created_at
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

module.exports = router;
