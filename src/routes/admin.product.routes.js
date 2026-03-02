const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

const controller = require('../controllers/admin.product.controller');

router.post('/', auth, role, controller.createProduct);
router.put('/:id', auth, role, controller.updateProduct);
router.delete('/:id', auth, role, controller.deleteProduct);

module.exports = router;
