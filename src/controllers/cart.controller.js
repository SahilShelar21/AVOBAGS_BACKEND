const db = require("../config/db");

/* ==============================
   GET CART (NOW SESSION BASED)
============================== */
const getCart = async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json([]);
    }

    const result = await db.query(
      `SELECT 
         ci.id,
         ci.product_id,
         ci.quantity,
         ci.price,
         p.name,
         p.image_url
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.session_id = $1`,
      [sessionId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET CART FAILED:", err.message);
    res.status(500).json([]);
  }
};

/* ==============================
   ADD TO CART (SESSION BASED)
============================== */
const addToCart = async (req, res) => {
  try {
    const { sessionId, productId, quantity } = req.body;

    if (!sessionId || !productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const productRes = await db.query(
      "SELECT price FROM products WHERE id = $1",
      [productId]
    );

    if (productRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const price = productRes.rows[0].price;

    const existing = await db.query(
      `SELECT id FROM cart_items 
       WHERE session_id = $1 AND product_id = $2`,
      [sessionId, productId]
    );

    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE cart_items
         SET quantity = quantity + $1
         WHERE session_id = $2 AND product_id = $3`,
        [quantity, sessionId, productId]
      );
    } else {
      await db.query(
        `INSERT INTO cart_items (session_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [sessionId, productId, quantity, price]
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error("ADD CART ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* ==============================
   REMOVE ITEM
============================== */
const removeFromCart = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(
      "DELETE FROM cart_items WHERE id = $1",
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove item" });
  }
};

/* ==============================
   UPDATE QTY
============================== */
const updateCartQty = async (req, res) => {
  const { id, quantity } = req.body;

  try {
    await db.query(
      `UPDATE cart_items
       SET quantity = $1
       WHERE id = $2`,
      [quantity, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE CART FAILED:", err.message);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  updateCartQty,
};
