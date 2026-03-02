const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* ===========================
   HELPER: GENERATE TOKEN
=========================== */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

/* ===========================
   SIGNUP
=========================== */
exports.signup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "All required fields must be filled",
      });
    }

    const existing = await db.query(
      "SELECT id FROM users WHERE email=$1 OR phone=$2",
      [email, phone]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "User already exists with this email or phone",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (name, email, phone, password)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, email, role, is_active`,
      [name, email, phone, hashedPassword]
    );

    const user = result.rows[0];

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user,
    });

  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({
      success: false,
      error: "Server error during signup",
    });
  }
};

/* ===========================
   LOGIN
=========================== */
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: "All fields required",
      });
    }

    const userRes = await db.query(
      `SELECT * FROM users WHERE email=$1 OR phone=$1`,
      [identifier]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: "Account is blocked",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      success: false,
      error: "Server error during login",
    });
  }
};

/* ===========================
   PROFILE
=========================== */
exports.getProfile = async (req, res) => {
  try {
    const userRes = await db.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id=$1",
      [req.user.id]
    );

    res.json({
      success: true,
      user: userRes.rows[0],
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Unable to fetch profile",
    });
  }
};
