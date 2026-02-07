const db = require("../config/db");
const Razorpay = require("razorpay");
const crypto = require("crypto");

/* ================================
   🔑 Razorpay Instance
================================ */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ==================================================
   1️⃣ CREATE ORDER (SAVE FORM + ITEMS IN DB)
================================================== */
exports.createOrder = async (req, res) => {
  try {
    const { sessionId, customer, items, totalAmount } = req.body;

    // 🔹 Save main order
    const orderResult = await db.query(
      `INSERT INTO orders
       (session_id, name, email, phone, address, city, state, pincode, total_amount, payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING')
       RETURNING id`,
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
      ]
    );

    const orderId = orderResult.rows[0].id;

    // 🔹 Save order items
    for (const item of items) {
      await db.query(
        `INSERT INTO order_items
         (order_id, product_id, name, price, quantity, image)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          orderId,
          item.productId,
          item.name,
          item.price,
          item.quantity,
          item.image,
        ]
      );
    }

    res.json({ success: true, orderId });
  } catch (err) {
    console.error("ORDER CREATE ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* ==================================================
   2️⃣ CREATE RAZORPAY ORDER
================================================== */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // ₹ → paise
      currency: "INR",
      receipt: `order_${orderId}`,
    });

    // 🔹 Save Razorpay order ID
    await db.query(
      `UPDATE orders
       SET razorpay_order_id = $1
       WHERE id = $2`,
      [razorpayOrder.id, orderId]
    );

    res.json(razorpayOrder);
  } catch (err) {
    console.error("RAZORPAY CREATE ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* ==================================================
   3️⃣ VERIFY PAYMENT
================================================== */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false });
    }

    // 🔹 Mark order as PAID
    await db.query(
      `UPDATE orders
       SET payment_status = 'PAID',
           razorpay_payment_id = $1,
           razorpay_signature = $2
       WHERE razorpay_order_id = $3`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("PAYMENT VERIFY ERROR:", err);
    res.status(500).json({ success: false });
  }
};

/* ==================================================
   4️⃣ GET MY ORDERS
================================================== */
exports.getMyOrders = async (req, res) => {
  const result = await db.query(
    `SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC`,
    [req.userId]
  );
  res.json(result.rows);
};
