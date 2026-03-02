const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/admin.order.controller');

router.put('/:id/status', auth, role, controller.updateOrderStatus);

module.exports = router;
