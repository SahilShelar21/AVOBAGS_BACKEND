const pool = require('../config/db');

exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  const adminId = req.user.id;

  await pool.query(
    'UPDATE orders SET status=$1 WHERE id=$2',
    [status, orderId]
  );

  await pool.query(
    `INSERT INTO admin_logs (admin_id, action, target_table, target_id)
     VALUES ($1,$2,$3,$4)`,
    [adminId, `ORDER_STATUS_${status}`, 'orders', orderId]
  );

  res.json({ message: 'Order status updated' });
};
