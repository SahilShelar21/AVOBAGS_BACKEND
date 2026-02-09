const express = require("express");
const router = express.Router();

const {
  createOrder,
  createRazorpayOrder,
  verifyPayment,
  getMyOrders,
} = require("../controllers/order.controller");

const auth = require("../middleware/auth");

// Save order (COD / Online)
router.post("/create", createOrder);

// Razorpay
router.post("/payment/create", createRazorpayOrder);
router.post("/verify", verifyPayment);

// User orders
router.get("/my-orders", auth, async (req, res) => {
  try {
    const userId = req.user.id; // OR req.user.userId

    const result = await pool.query(
      `SELECT id, total_amount, payment_status, payment_method, created_at
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows); // ✅ ALWAYS ARRAY
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

module.exports = router;
