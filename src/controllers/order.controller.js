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
    const { sessionId, customer, items, totalAmount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart empty" });
    }

    const paymentStatus =
      paymentMethod === "cod" ? "CONFIRMED" : "PENDING";

    const orderResult = await db.query(
      `INSERT INTO orders
       (session_id, name, email, phone, address, city, state, pincode,
        total_amount, payment_status, payment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
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

    for (const item of items) {
      await db.query(
        `INSERT INTO order_items
         (order_id, product_id, name, price, quantity, image)
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
    }

    // COD flow
    if (paymentMethod === "cod") {
      await sendEmail({
        to: customer.email,
        subject: "Your AVOBAGS Order is Confirmed",
        html: orderEmail(order, items),
      });

      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: "🛍️ New COD Order - AVOBAGS",
        html: orderEmail(order, items),
      });

      const msg = encodeURIComponent(whatsappMessage(order, items));
      console.log(
        `ADMIN WHATSAPP → https://wa.me/${process.env.ADMIN_WHATSAPP}?text=${msg}`
      );
    }

    return res.json({ success: true, orderId: order.id });

  } catch (err) {
    console.error("ORDER CREATE ERROR:", err);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  createOrder
};
