const db = require("../config/db");

/* ==============================
   GET CART (SESSION BASED)
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
      WHERE ci.session_id = $1
      ORDER BY ci.id DESC`,
      [sessionId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET CART FAILED:", err.message);
    res.status(500).json([]);
  }
};

/* ==============================
   ADD TO CART
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

    // Check if product already exists in cart
    const existing = await db.query(
      `SELECT id, quantity
       FROM cart_items
       WHERE session_id = $1 AND product_id = $2`,
      [sessionId, productId]
    );

    let cartItemId;

    if (existing.rows.length > 0) {
      // Update existing item quantity
      const updateResult = await db.query(
        `UPDATE cart_items
         SET quantity = quantity + $1
         WHERE session_id = $2 AND product_id = $3
         RETURNING id, quantity`,
        [quantity, sessionId, productId]
      );
      cartItemId = updateResult.rows[0].id;
    } else {
      // Insert new item
      const insertResult = await db.query(
        `INSERT INTO cart_items (session_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [sessionId, productId, quantity, price]
      );
      cartItemId = insertResult.rows[0].id;
    }

    // Return the updated cart
    const updatedCart = await db.query(
      `SELECT 
        ci.id,
        ci.product_id,
        ci.quantity,
        ci.price,
        p.name,
        p.image_url
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.session_id = $1
      ORDER BY ci.id DESC`,
      [sessionId]
    );

    res.json({
      success: true,
      cartItemId,
      cart: updatedCart.rows,
    });
  } catch (err) {
    console.error("ADD CART ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* ==============================
   REMOVE ITEM (PERMANENT DELETE)
============================== */
const removeFromCart = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `DELETE FROM cart_items
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("REMOVE CART ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* ==============================
   UPDATE QUANTITY
============================== */
const updateCartQty = async (req, res) => {
  const { id, quantity } = req.body;

  try {
    if (quantity <= 0) {
      await db.query(`DELETE FROM cart_items WHERE id = $1`, [id]);
      return res.json({ success: true, removed: true });
    }

    await db.query(
      `UPDATE cart_items SET quantity = $1 WHERE id = $2`,
      [quantity, id]
    );

    res.json({ success: true, removed: false });
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
