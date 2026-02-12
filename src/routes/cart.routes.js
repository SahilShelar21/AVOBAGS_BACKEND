const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
  getCart,
  addToCart,
  removeFromCart,
  updateCartQty,
} = require("../controllers/cart.controller");

router.get("/", auth, getCart);
router.post("/add", auth, addToCart);
router.put("/update", updateCartQty);
router.delete("/:id", removeFromCart);

module.exports = router;
