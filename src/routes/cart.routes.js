const express = require("express");
const router = express.Router();

const {
  getCart,
  addToCart,
  removeFromCart,
  updateCartQty,
} = require("../controllers/cart.controller");

router.get("/", getCart);
router.post("/add", addToCart);
router.put("/update", updateCartQty); 
router.delete("/:id", removeFromCart);


module.exports = router;
