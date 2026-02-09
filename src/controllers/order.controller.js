const db = require("../config/db");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const sendEmail = require("../utils/sendEmail");
const orderEmail = require("../utils/orderEmailTemplate");
const whatsappMessage = require("../utils/whatsappMessage");

/* ==============================
   RAZORPAY INSTANCE (SAFE)
================================ */
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/* ==============================
   CREATE ORDER (COD / ONLINE)
================================ */
exports.createOrder = async (req, res) => {
  try {
    const { sessionId, customer, items, totalAmount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart empty" });
    }

    const paymentStatus =
      paymentMethod === "cod" ? "CONFIRMED" : "PENDING";

    const orderResult = await db.query(
      `INSERT INTO orders
      (
        session_id,
        name,
        email,
        phone,
        address,
        city,
        state,
        pincode,
        total_amount,
        payment_status,
        payment_method
      )
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

    /* ==============================
       COD FLOW (NO RAZORPAY)
    ================================ */
    if (paymentMethod === "cod") {
      // 📧 Email to customer
      await sendEmail({
        to: customer.email,
        subject: "Your AVOBAGS Order is Confirmed",
        html: orderEmail(order, items),
      });

      // 📲 WhatsApp to admin
      const msg = encodeURIComponent(
        whatsappMessage(order, items)
      );

      console.log(
        `ADMIN WHATSAPP → https://wa.me/${process.env.ADMIN_WHATSAPP}?text=${msg}`
      );

      return res.json({
        success: true,
        orderId: order.id,
      });
    }

    /* ==============================
       ONLINE PAYMENT (LATER)
    ================================ */
    return res.json({
      success: true,
      orderId: order.id,
    });

  } catch (err) {
    console.error("ORDER CREATE ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* ==============================
   CREATE RAZORPAY ORDER (LATER)
================================ */
exports.createRazorpayOrder = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(400).json({ success: false });
    }

    const { amount, orderId } = req.body;

    const rpOrder = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `order_${orderId}`,
    });

    await db.query(
      `UPDATE orders
       SET razorpay_order_id=$1
       WHERE id=$2`,
      [rpOrder.id, orderId]
    );

    res.json(rpOrder);
  } catch (err) {
    console.error("RAZORPAY ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* ==============================
   VERIFY PAYMENT (LATER)
================================ */
exports.verifyPayment = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(400).json({ success: false });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false });
    }

    await db.query(
      `UPDATE orders
       SET payment_status='PAID',
           razorpay_payment_id=$1
       WHERE id=$2`,
      [razorpay_payment_id, orderId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* ==============================
   MY ORDERS (JWT USER)
================================ */
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user?.id; // ✅ FIXED

    if (!userId) {
      return res.status(401).json([]);
    }

    const result = await db.query(
      `SELECT *
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET MY ORDERS ERROR:", err);
    res.status(500).json([]);
  }
};
