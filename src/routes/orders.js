const express = require("express");
const router = express.Router();

const {
  createOrder,
  createRazorpayOrder,
  verifyPayment,
} = require("../controllers/order.controller");

const { getMyOrders } = require("../controllers/order.controller");
const auth = require("../middleware/auth");

router.get("/my-orders", auth, getMyOrders);

// Save order + form
router.post("/create", createOrder);

// Create Razorpay order
router.post("/payment/create", createRazorpayOrder);

// Verify payment
router.post("/verify", verifyPayment);

module.exports = router;
