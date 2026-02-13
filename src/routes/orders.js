const express = require("express");
const router = express.Router();

const db = require("../config/db");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const axios = require("axios");

/* ==============================
   ENV VALIDATION
============================== */
if (!process.env.RAZORPAY_KEY_SECRET) {
  console.error("❌ RAZORPAY_KEY_SECRET missing in environment variables");
}

/* ==============================
   EMAIL TRANSPORTER
============================== */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ==============================
   SAFE EMAIL SENDER
============================== */
const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!to) return;
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("📧 Email error:", err.message);
  }
};

/* ==============================
   WHATSAPP ADMIN ALERT
============================== */
const sendWhatsAppAdmin = async (message) => {
  try {
    if (!process.env.WHATSAPP_API_URL || !process.env.ADMIN_WHATSAPP) return;

    await axios.post(process.env.WHATSAPP_API_URL, {
      to: process.env.ADMIN_WHATSAPP,
      message,
    });
  } catch (err) {
    console.error("📱 WhatsApp error:", err.message);
  }
};

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
      return res.status(400).json({
        success: false,
        message: "Missing payment details",
        
      });
    }

    /* ==============================
       SIGNATURE VALIDATION
    ============================== */
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValid =
      generatedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(generatedSignature),
        Buffer.from(razorpay_signature)
      );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    /* ==============================
       IDEMPOTENCY CHECK
    ============================== */
    const existing = await client.query(
      "SELECT id FROM orders WHERE razorpay_payment_id = $1",
      [razorpay_payment_id]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Payment already processed",
      });
    }

    /* ==============================
       INSERT ORDER (TRANSACTION)
    ============================== */
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO orders 
      (user_id, session_id, name, email, phone, address, city, state, pincode, total_amount, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'online','SUCCESS',$11,$12,NOW())
      RETURNING *`,
      [
        orderData.user_id || null,
        orderData.session_id,
        orderData.name,
        orderData.email,
        orderData.phone,
        orderData.address,
        orderData.city,
        orderData.state,
        orderData.pincode,
        orderData.total_amount,
        razorpay_order_id,
        razorpay_payment_id,
      ]
    );

    const order = result.rows[0];

    await client.query("COMMIT");

    /* ==============================
       SEND NOTIFICATIONS (ASYNC)
    ============================== */
    sendEmail({
      to: order.email,
      subject: `Order #${order.id} Confirmation`,
      html: `
        <h2>Thank you for your order!</h2>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Payment ID:</strong> ${order.razorpay_payment_id}</p>
        <p><strong>Total:</strong> ₹${order.total_amount}</p>
        <p>We will deliver your order soon.</p>
      `,
    });

    sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `🛒 New Order #${order.id}`,
      html: `
        <h3>New Order Received</h3>
        <p><strong>Name:</strong> ${order.name}</p>
        <p><strong>Email:</strong> ${order.email}</p>
        <p><strong>Amount:</strong> ₹${order.total_amount}</p>
        <p><strong>Payment ID:</strong> ${order.razorpay_payment_id}</p>
      `,
    });

    sendWhatsAppAdmin(
      `🛒 New Order #${order.id}
          Customer: ${order.name}
          Amount: ₹${order.total_amount}`
    );

    return res.json({ success: true, order });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Verify payment error:", err);
    return res.status(500).json({
      success: false,
      message: "Order saving failed",
    });
  } finally {
    client.release();
  }
});

module.exports = router;
