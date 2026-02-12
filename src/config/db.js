const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: isProduction
    ? { rejectUnauthorized: false } // ✅ Render / Production
    : false,                        // ✅ Local
});

module.exports = pool;
