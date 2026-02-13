const db = require("../config/db");
const Razorpay = require("razorpay");
const sendEmail = require("../utils/sendEmail");
const orderEmail = require("../utils/orderEmailTemplate");
const whatsappMessage = require("../utils/whatsappMessage");

let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Create order (COD or Online)
const createOrder = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { sessionId, customer, items, totalAmount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Stock validation (optional, recommended)
    for (const item of items) {
      const stockRes = await db.query(
        "SELECT stock FROM products WHERE id=$1",
        [item.productId]
      );
      if (!stockRes.rows[0] || stockRes.rows[0].stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.name} is out of stock`,
        });
      }
    }

    const paymentStatus = paymentMethod === "cod" ? "CONFIRMED" : "PENDING";

    const orderRes = await db.query(
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

    const order = orderRes.rows[0];

    // Insert order items
    for (const item of items) {
      await db.query(
        `INSERT INTO order_items
        (order_id, product_id, name, price, quantity, image)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, item.productId, item.name, item.price, item.quantity, item.image || null]
      );

      // Reduce stock
      await db.query(
        `UPDATE products SET stock = stock - $1 WHERE id=$2`,
        [item.quantity, item.productId]
      );
    }

    // COD or Online notifications
    if (paymentMethod === "cod") {
      await notifyOrder(order, items);
    }

    // Return order ID
    res.json({ success: true, orderId: order.id });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    res.status(500).json({ success: false });
  }
};

// Razorpay payment verification webhook
const razorpayWebhook = async (req, res) => {
  try {
    const { payload } = req.body;
    if (payload.payment.entity.status === "captured") {
      const orderId = payload.payment.entity.notes.order_id;
      await db.query(
        `UPDATE orders SET payment_status='CONFIRMED' WHERE id=$1`,
        [orderId]
      );

      // Fetch order details
      const orderRes = await db.query(
        "SELECT * FROM orders WHERE id=$1",
        [orderId]
      );
      const order = orderRes.rows[0];

      const itemsRes = await db.query(
        "SELECT * FROM order_items WHERE order_id=$1",
        [orderId]
      );
      const items = itemsRes.rows;

      await notifyOrder(order, items);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("RAZORPAY WEBHOOK ERROR:", err);
    res.status(500).json({ success: false });
  }
};

// Helper: send email & WhatsApp
const notifyOrder = async (order, items) => {
  // Email to customer
  await sendEmail({
    to: order.email,
    subject: "✅ Your AVOBAGS Order is Confirmed",
    html: orderEmail(order, items),
  });

  // Email to admin
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `🛍️ New Order #${order.id}`,
    html: orderEmail(order, items),
  });

  // WhatsApp message to admin
  const msg = encodeURIComponent(order.items ? order.items.map(i => i.name).join(", ") : "");
  console.log(`📲 ADMIN WHATSAPP → https://wa.me/${process.env.ADMIN_WHATSAPP}?text=${msg}`);
};

// Get user orders with status
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await db.query(
      `SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ success: true, orders: orders.rows });
  } catch (err) {
    console.error("GET MY ORDERS ERROR:", err);
    res.status(500).json({ success: false });
  }
};

module.exports = { createOrder, razorpayWebhook, getMyOrders };
