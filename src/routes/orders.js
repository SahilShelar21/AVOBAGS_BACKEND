const express = require("express");
const router = express.Router();
const db = require("../config/db");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const axios = require("axios");
const whatsappMessage = require("../utils/whatsappMessage");
const orderController = require("../controllers/order.controller");
const twilio = require("twilio");

// initialize Twilio client if credentials exist
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

/* ==============================
   RAZORPAY INSTANCE
============================== */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ==============================
   CREATE RAZORPAY ORDER
============================== */
router.post("/create-razorpay-order", async (req, res) => {
  try {
    const { amount, items } = req.body;

    // build notes string for additional information in dashboard
    let notes = {};
    if (Array.isArray(items) && items.length > 0) {
      notes.products = items.join(", ");
    }

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error("Create Razorpay order error:", err);
    res.status(500).json({ success: false });
  }
});

/* ==============================
   VERIFY PAYMENT
============================== */
router.post("/verify-payment", async (req, res) => {
  const client = await db.connect();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderData,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false });
    }

    await client.query("BEGIN");

    const orderInsert = await client.query(
  `INSERT INTO orders 
  (name, email, phone, address, city, district, state, pincode, total_amount, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, created_at)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'online','SUCCESS',$10,$11,NOW())
  RETURNING *`,
  [
    orderData.name,
    orderData.email,
    orderData.phone,
    orderData.address,
    orderData.city,
    orderData.district,   // ✅ added
    orderData.state,
    orderData.pincode,
    orderData.total_amount,
    razorpay_order_id,
    razorpay_payment_id,
  ]
);

    const order = orderInsert.rows[0];
    const items = Array.isArray(orderData.items) ? orderData.items : [];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, price, quantity, image)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          order.id,
          item.productId,
          item.name,
          item.price,
          item.quantity,
          item.image || null,
        ]
      );

      // Reduce stock
      await client.query(
        `UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id=$2`,
        [item.quantity, item.productId]
      );
    }

    await client.query("COMMIT");

    // pre-calc link variables so they can be reused
    const adminNumber = process.env.ADMIN_WHATSAPP || "919137844068";
    const msg = whatsappMessage(order, items);

    // Async notifications (don't block response)
    (async () => {
      try {
        // Use Twilio if configured
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
            // fallback to existing behaviour
            const encoded = encodeURIComponent(msg);
            console.log(`📲 ADMIN WHATSAPP LINK → https://wa.me/${adminNumber}?text=${encoded}`);
          }
        } else if (process.env.WHATSAPP_API_URL) {
          try {
            await axios.post(process.env.WHATSAPP_API_URL, {
              to: adminNumber,
              message: msg,
            });
            console.log(`✅ Admin WhatsApp sent via API for Order #${order.id}`);
          } catch (err) {
            console.error(`WhatsApp API send failed:`, err.message);
            // Log fallback link
            const encoded = encodeURIComponent(msg);
            console.log(`📲 ADMIN WHATSAPP FALLBACK → https://wa.me/${adminNumber}?text=${encoded}`);
          }
        } else {
          // No API configured, just log the link
          const encoded = encodeURIComponent(msg);
          console.log(`📲 ADMIN WHATSAPP LINK → https://wa.me/${adminNumber}?text=${encoded}`);
        }
      } catch (err) {
        console.error("Notification error:", err.message);
      }
    })();

    // create waLink for possible frontend use
    const encodedMsg = encodeURIComponent(msg);

    res.json({
      success: true,
      order,
      waLink: `https://wa.me/${adminNumber}?text=${encodedMsg}`,
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Verify error:", err);
    res.status(500).json({ success: false });
  } finally {
    client.release();
  }
});

// Create order (supports COD / guest)
router.post("/create", async (req, res) => {
  return orderController.createOrder(req, res);
});

// Public: get order by id (for success page)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orderRes = await db.query('SELECT * FROM orders WHERE id=$1', [id]);
    if (orderRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    const order = orderRes.rows[0];
    const itemsRes = await db.query('SELECT * FROM order_items WHERE order_id=$1', [id]);
    const items = itemsRes.rows;
    return res.json({ success: true, order: { ...order, items } });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;