const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  getCart,
  addToCart,
  removeFromCart,
  updateCartQty,
} = require("../controllers/cart.controller");

router.get("/", authMiddleware, getCart);
router.post("/add", authMiddleware, addToCart);
router.put("/update", authMiddleware, updateCartQty);
router.delete("/:id", authMiddleware, removeFromCart);


module.exports = router;
