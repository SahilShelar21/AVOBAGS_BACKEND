const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  getProfile,
} = require("../controllers/auth.controller");

const authMiddleware = require("../middleware/auth");

// Signup
router.post("/signup", signup);

// Login
router.post("/login", login);

// Logged-in user profile
router.get("/me", authMiddleware, getProfile);

module.exports = router;
