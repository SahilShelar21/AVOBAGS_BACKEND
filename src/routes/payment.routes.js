const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const controller = require('../controllers/payment.controller');

router.post('/create', auth, controller.createPayment);
router.post('/verify', auth, controller.verifyPayment);

module.exports = router;
