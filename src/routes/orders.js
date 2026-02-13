const express = require("express");
const router = express.Router();

const db = require("../config/db");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const axios = require("axios");

/* ==============================
   ENV VALIDATION
============================== */
if (!process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("RAZORPAY_KEY_SECRET not configured");
}

/* ==============================
   EMAIL TRANSPORTER (Reuse)
============================== */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ==============================
   SEND EMAIL
============================== */
const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email error:", err.message);
  }
};

/* ==============================
   SEND WHATSAPP TO ADMIN
============================== */
const sendWhatsAppAdmin = async (message) => {
  if (!process.env.WHATSAPP_API_URL) return;

  try {
    await axios.post(process.env.WHATSAPP_API_URL, {
      to: process.env.ADMIN_WHATSAPP,
      message,
    });
  } catch (err) {
    console.error("WhatsApp error:", err.message);
  }
};

/* ==============================
   VERIFY PAYMENT ROUTE
============================== */
router.post("/verify-payment", async (req, res) => {
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
       SIGNATURE VERIFICATION
    ============================== */
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
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
    const existing = await db.query(
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
    await db.query("BEGIN");

    const result = await db.query(
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

    await db.query("COMMIT");

    /* ==============================
       SEND NOTIFICATIONS (ASYNC SAFE)
    ============================== */
    sendEmail({
      to: order.email,
      subject: `Order #${order.id} Confirmation`,
      html: `
        <h3>Thank you for your order!</h3>
        <p>Payment ID: ${order.razorpay_payment_id}</p>
        <p>Total Amount: ₹${order.total_amount}</p>
        <p>We will deliver your order soon.</p>
      `,
    });

    sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `New Order #${order.id}`,
      html: `
        <h3>New Order Received!</h3>
        <p>Customer: ${order.name}</p>
        <p>Email: ${order.email}</p>
        <p>Payment ID: ${order.razorpay_payment_id}</p>
        <p>Total Amount: ₹${order.total_amount}</p>
      `,
    });

    sendWhatsAppAdmin(
      `New Order #${order.id}\nCustomer: ${order.name}\nAmount: ₹${order.total_amount}`
    );

    return res.json({ success: true, order });

  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Verify payment error:", err);
    return res.status(500).json({
      success: false,
      message: "Order saving failed",
    });
  }
});

module.exports = router;
