const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// SIGNUP
exports.signup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, error: "All fields required" });
    }

    // 🔥 Check if user already exists
    const existingUser = await db.query(
      "SELECT id FROM users WHERE email=$1 OR phone=$2",
      [email, phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (name, email, phone, password)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, email`,
      [name, email, phone, hashedPassword]
    );

    res.status(201).json({
      success: true,
      user: result.rows[0],
    });

  } catch (err) {
    console.error("SIGNUP ERROR:", err.message);
    res.status(500).json({
      success: false,
      error: "Server error during signup",
    });
  }
};


// LOGIN
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

const userRes = await db.query(
  `SELECT * FROM users WHERE email=$1 OR phone=$1`,
  [identifier]
);


    if (userRes.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

const token = jwt.sign(
  {
    id: user.id,
    email: user.email,
    role: user.role || "user",
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);


    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ success: false });
  }
};

// PROFILE
exports.getProfile = async (req, res) => {
  res.json(req.user);
};
