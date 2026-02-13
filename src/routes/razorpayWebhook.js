const express = require("express");
const crypto = require("crypto");
const db = require("../config/db");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    const receivedSignature = req.headers["x-razorpay-signature"];

    if (!receivedSignature) {
      return res.status(400).json({ error: "Missing signature" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const event = JSON.parse(req.body.toString());

    switch (event.event) {
      case "payment.captured": {
        const payment = event.payload.payment.entity;

        const existing = await db.query(
          "SELECT id FROM orders WHERE razorpay_payment_id=$1",
          [payment.id]
        );

        if (existing.rows.length > 0) {
          return res.status(200).json({ message: "Already processed" });
        }

        await db.query(
          `UPDATE orders 
           SET payment_status='SUCCESS',
               razorpay_payment_id=$1,
               updated_at=NOW()
           WHERE razorpay_order_id=$2`,
          [payment.id, payment.order_id]
        );

        console.log("✅ Payment captured via webhook");
        break;
      }

      case "payment.failed": {
        const payment = event.payload.payment.entity;

        await db.query(
          `UPDATE orders 
           SET payment_status='FAILED',
               updated_at=NOW()
           WHERE razorpay_order_id=$1`,
          [payment.order_id]
        );

        console.log("❌ Payment failed via webhook");
        break;
      }

      default:
        console.log("Unhandled event:", event.event);
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

module.exports = router;
