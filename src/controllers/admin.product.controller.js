const pool = require('../config/db');

/* ADD PRODUCT */
exports.createProduct = async (req, res) => {
  const { name, description, price, image_url, stock } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO products (name, description, price, image_url, stock)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, description, price, image_url, stock]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Product creation failed' });
  }
};

/* UPDATE PRODUCT */
exports.updateProduct = async (req, res) => {
  const { name, description, price, image_url, stock } = req.body;

  try {
    await pool.query(
      `UPDATE products
       SET name=$1, description=$2, price=$3, image_url=$4, stock=$5
       WHERE id=$6`,
      [name, description, price, image_url, stock, req.params.id]
    );

    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ message: 'Update failed' });
  }
};

/* SOFT DELETE PRODUCT */
exports.deleteProduct = async (req, res) => {
  try {
    await pool.query(
      'UPDATE products SET is_active=false WHERE id=$1',
      [req.params.id]
    );

    res.json({ message: 'Product deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Delete failed' });
  }
};
