const router = require('express').Router();
const controller = require('../controllers/product.controller');

router.get('/', controller.getAllProducts);
router.get('/:id', controller.getProductById);

module.exports = router; // ❗ MUST EXIST
