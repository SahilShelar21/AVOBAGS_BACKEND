const db = require("../config/db");
const Razorpay = require("razorpay");
const axios = require("axios");
const whatsappMessage = require("../utils/whatsappMessage");
const twilio = require("twilio");

let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/* ==============================
   CREATE ORDER (supports COD & guest)
============================== */
const createOrder = async (req, res) => {
  const client = await db.connect();

  try {
    const { sessionId, customer, items, totalAmount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    await client.query("BEGIN");

    const paymentStatus = paymentMethod === "cod" ? "CONFIRMED" : "PENDING";

    const insertOrder = await client.query(
      `INSERT INTO orders
      (user_id, session_id, name, email, phone, address, city, state, pincode, total_amount, payment_status, payment_method, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       RETURNING *`,
      [
        null,
        sessionId || null,
        customer?.name || null,
        customer?.email || null,
        customer?.phone || null,
        customer?.address || null,
        customer?.city || null,
        customer?.state || null,
        customer?.pincode || null,
        totalAmount || 0,
        paymentStatus,
        paymentMethod,
      ]
    );

    const order = insertOrder.rows[0];

    // Insert order items and reduce stock
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items
        (order_id, product_id, name, price, quantity, image)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, item.productId || item.product_id, item.name, item.price, item.quantity, item.image || item.image_url || null]
      );

      await client.query(
        `UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id=$2`,
        [item.quantity, item.productId || item.product_id]
      );
    }

    await client.query("COMMIT");

    // Send WhatsApp notification to admin (async, don't block response)
    (async () => {
      try {
        const msg = whatsappMessage(order, items);
        const adminNumber = process.env.ADMIN_WHATSAPP || "918591650200";

        if (twilioClient && process.env.TWILIO_WHATSAPP_NUMBER) {
          try {
            await twilioClient.messages.create({
              from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
              to: `whatsapp:${adminNumber.startsWith("+") ? adminNumber : "+" + adminNumber}`,
              body: msg,
            });
            console.log(`✅ Admin WhatsApp sent via Twilio for Order #${order.id}`);
          } catch (err) {
            console.error(`Twilio WhatsApp send failed:`, err.message);
            const encoded = encodeURIComponent(msg);
            console.log(`📲 ADMIN WHATSAPP LINK → https://wa.me/${adminNumber}?text=${encoded}`);
          }
        } else if (process.env.WHATSAPP_API_URL) {
          try {
            await axios.post(process.env.WHATSAPP_API_URL, { to: adminNumber, message: msg });
            console.log(`✅ Admin WhatsApp sent via API for Order #${order.id}`);
          } catch (err) {
            console.error(`WhatsApp API send failed:`, err.message);
            const encoded = encodeURIComponent(msg);
            console.log(`📲 ADMIN WHATSAPP LINK → https://wa.me/${adminNumber}?text=${encoded}`);
          }
        } else {
          const encoded = encodeURIComponent(msg);
          console.log(`📲 ADMIN WHATSAPP LINK → https://wa.me/${adminNumber}?text=${encoded}`);
        }
      } catch (err) {
        console.error("Notification error:", err.message || err);
      }
    })();

    const encodedMsg = encodeURIComponent(whatsappMessage(order, items));
    const waLink = `https://wa.me/${process.env.ADMIN_WHATSAPP || "918591650200"}?text=${encodedMsg}`;

    return res.json({ success: true, orderId: order.id, waLink });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE ORDER ERROR:", err);
    return res.status(500).json({ success: false, message: "Order creation failed" });
  } finally {
    client.release();
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
      const orderRes = await db.query("SELECT * FROM orders WHERE id=$1", [orderId]);
      const order = orderRes.rows[0];

      const itemsRes = await db.query("SELECT * FROM order_items WHERE order_id=$1", [orderId]);
      const items = itemsRes.rows;

      // notify
      const msg = whatsappMessage(order, items);
      const adminNumber = process.env.ADMIN_WHATSAPP || "918591650200";
      if (process.env.WHATSAPP_API_URL) {
        await axios.post(process.env.WHATSAPP_API_URL, { to: adminNumber, message: msg });
      } else {
        console.log(`📲 ADMIN WHATSAPP → https://wa.me/${adminNumber}?text=${encodeURIComponent(msg)}`);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("RAZORPAY WEBHOOK ERROR:", err);
    res.status(500).json({ success: false });
  }
};

// Get user orders with status
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await db.query(`SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC`, [userId]);
    res.json({ success: true, orders: orders.rows });
  } catch (err) {
    console.error("GET MY ORDERS ERROR:", err);
    res.status(500).json({ success: false });
  }
};

module.exports = { createOrder, razorpayWebhook, getMyOrders };
