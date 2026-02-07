const pool = require('../config/db');

exports.dashboardStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role='USER') AS users,
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status='PAID') AS revenue
    `);
    res.json(stats.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Dashboard error' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await pool.query(`
      SELECT o.id, u.name, u.email, o.total_amount, o.status, o.created_at
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    res.json(orders.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};
