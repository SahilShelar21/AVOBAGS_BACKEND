const db = require("../config/db");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const sendEmail = require("../utils/sendEmail");
const orderEmail = require("../utils/orderEmailTemplate");
const whatsappMessage = require("../utils/whatsappMessage");

/* ==============================
   RAZORPAY INSTANCE
================================ */
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/* ==============================
   CREATE ORDER
================================ */
const createOrder = async (req, res) => {
  try {
    const userId = req.user?.id || null; // GET USER ID FROM JWT IF LOGGED IN
    const { sessionId, customer, items, totalAmount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const paymentStatus = paymentMethod === "cod" ? "CONFIRMED" : "PENDING";

    // 1️⃣ CREATE ORDER
    const orderResult = await db.query(
      `INSERT INTO orders
        (user_id, session_id, name, email, phone, address, city, state, pincode, total_amount, payment_status, payment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        userId,
        sessionId,
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        customer.city,
        customer.state,
        customer.pincode,
        totalAmount,
        paymentStatus,
        paymentMethod,
      ]
    );

    const order = orderResult.rows[0];

    // 2️⃣ INSERT ORDER ITEMS
    for (const item of items) {
      await db.query(
        `INSERT INTO order_items
          (order_id, product_id, name, price, quantity, image)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, item.productId, item.name, item.price, item.quantity, item.image || null]
      );
    }

    // 3️⃣ HANDLE COD FLOW
    if (paymentMethod === "cod") {
      // Send email to user
      await sendEmail({
        to: customer.email,
        subject: "✅ Your AVOBAGS Order is Confirmed",
        html: orderEmail(order, items),
      });

      // Send email to admin
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: "🛍️ New COD Order - AVOBAGS",
        html: orderEmail(order, items),
      });

      // WhatsApp message to admin
      const msg = encodeURIComponent(whatsappMessage(order, items));
      console.log(`📲 ADMIN WHATSAPP → https://wa.me/${process.env.ADMIN_WHATSAPP}?text=${msg}`);
    }

    return res.json({ success: true, orderId: order.id });
  } catch (err) {
    console.error("ORDER CREATE ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* ==============================
   GET MY ORDERS
================================ */
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await db.query(
      `SELECT * FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ success: true, orders: orders.rows });
  } catch (err) {
    console.error("GET MY ORDERS ERROR:", err);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
};
