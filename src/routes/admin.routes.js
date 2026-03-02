const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/admin.controller');

router.get('/dashboard', auth, role, controller.dashboardStats);
router.get('/orders', auth, role, controller.getAllOrders);

module.exports = router; // ❗ MUST EXIST
