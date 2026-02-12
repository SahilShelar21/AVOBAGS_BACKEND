const express = require("express");
const router = express.Router();  
const auth = require("../middleware/authMiddleware");   // 👈 IMPORTANT
const {createOrder, getMyOrders} = require("../controllers/order.controller");

// Create order (COD / Online)
router.post("/create", createOrder);
router.get("/my-orders", auth, getMyOrders);


module.exports = router;
