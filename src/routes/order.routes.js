const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const controller = require('../controllers/order.controller');
const { createOrderSchema } = require('../validators/order.validator');

// CREATE ORDER (validated + authenticated)
router.post(
  '/',
  auth,
  validate(createOrderSchema),
  controller.createOrder
);

// GET USER ORDERS
router.get('/', auth, controller.getUserOrders);

module.exports = router;
