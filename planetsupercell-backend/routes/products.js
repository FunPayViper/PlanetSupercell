// Файл: routes/products.js
const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');

// GET /api/products - Получить все товары (с ?keyword=...&categoryId=...&pageNumber=...)
router.get('/', getAllProducts);

// GET /api/products/:id - Получить товар по ID
router.get('/:id', getProductById);

// POST /api/products - Создать товар (только админ)
router.post('/', protect, admin, createProduct);

// PUT /api/products/:id - Обновить товар (только админ)
router.put('/:id', protect, admin, updateProduct);

// DELETE /api/products/:id - Удалить товар (только админ)
router.delete('/:id', protect, admin, deleteProduct);

module.exports = router;