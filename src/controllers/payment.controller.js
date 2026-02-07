const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const pool = require('../config/db');

/* CREATE RAZORPAY ORDER */
exports.createPayment = async (req, res) => {
  const { orderId, amount } = req.body;

  const razorOrder = await razorpay.orders.create({
    amount: amount * 100,
    currency: 'INR',
    receipt: `order_${orderId}`
  });

  await pool.query(
    'UPDATE orders SET razorpay_order_id=$1 WHERE id=$2',
    [razorOrder.id, orderId]
  );

  res.json(razorOrder);
};

/* VERIFY PAYMENT */
exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    await pool.query(
      `UPDATE orders
       SET status='PAID', razorpay_payment_id=$1
       WHERE razorpay_order_id=$2`,
      [razorpay_payment_id, razorpay_order_id]
    );

    res.json({ message: 'Payment verified' });
  } else {
    res.status(400).json({ message: 'Invalid signature' });
  }
};
