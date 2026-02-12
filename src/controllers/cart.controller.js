const db = require("../config/db");

const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

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
       WHERE ci.user_id = $1`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET CART FAILED:", err.message);
    res.status(500).json([]);
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // ✅ Get real product price from DB
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
       WHERE user_id = $1 AND product_id = $2`,
      [userId, productId]
    );

    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE cart_items
         SET quantity = quantity + $1
         WHERE user_id = $2 AND product_id = $3`,
        [quantity, userId, productId]
      );
    } else {
      await db.query(
        `INSERT INTO cart_items (user_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [userId, productId, quantity, price]
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error("ADD CART ERROR:", err);
    res.status(500).json({ success: false });
  }
};

const removeFromCart = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await db.query(
      "DELETE FROM cart_items WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove item" });
  }
};

const updateCartQty = async (req, res) => {
  const { id, quantity } = req.body;
  const userId = req.user.id;

  try {
    await db.query(
      `UPDATE cart_items
       SET quantity = $1
       WHERE id = $2 AND user_id = $3`,
      [quantity, id, userId]
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
